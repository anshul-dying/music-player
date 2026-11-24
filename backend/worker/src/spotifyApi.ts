import {
  decryptToken,
  encryptToken,
  getSpotifyTokenByUserId,
  updateSpotifyTokenByUserId,
} from "@mp/db";

export interface SpotifyTrackItem {
  title: string;
  artist: string;
  durationMs: number;
  albumArt: string | null;
}

export interface SpotifyPlaylistWithTracks {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  tracks: SpotifyTrackItem[];
}

export async function getWorkerSpotifyToken(userId: string): Promise<string> {
  const row = await getSpotifyTokenByUserId(userId);
  if (!row) throw new Error("spotify_not_connected");

  if (row.expiresAt.getTime() > Date.now() + 60_000) {
    return decryptToken(row.accessTokenEnc);
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || "";
  const refreshToken = decryptToken(row.refreshTokenEnc);

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  if (clientSecret) body.set("client_secret", clientSecret);

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed (${res.status})`);

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  };

  await updateSpotifyTokenByUserId(userId, {
    accessTokenEnc: encryptToken(data.access_token),
    refreshTokenEnc: encryptToken(data.refresh_token || refreshToken),
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope ?? row.scope,
  });

  return data.access_token;
}

function mapSpotifyTrack(raw: any): SpotifyTrackItem | null {
  const t = raw?.track ?? raw;
  if (!t || !t.name) return null;
  const artists = Array.isArray(t.artists)
    ? t.artists.map((a: any) => a?.name).filter(Boolean).join(", ")
    : "";
  return {
    title: String(t.name),
    artist: artists || "Unknown Artist",
    durationMs: Number(t.duration_ms || 0),
    albumArt: t.album?.images?.[0]?.url ?? null,
  };
}

async function fetchPaginatedItems(
  accessToken: string,
  initialUrl: string,
  maxItems = 500
): Promise<any[]> {
  const items: any[] = [];
  let nextUrl: string | null = initialUrl;

  while (nextUrl && items.length < maxItems) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Spotify API error (${res.status})${errText ? `: ${errText}` : ""}`);
    }
    const page = (await res.json()) as { items?: any[]; next?: string | null };
    if (Array.isArray(page.items)) {
      items.push(...page.items);
    }
    nextUrl = page.next ?? null;
  }

  return items.slice(0, maxItems);
}

export async function fetchSpotifyLikedTracks(accessToken: string): Promise<SpotifyTrackItem[]> {
  const raw = await fetchPaginatedItems(
    accessToken,
    "https://api.spotify.com/v1/me/tracks?limit=50"
  );
  return raw.map(mapSpotifyTrack).filter((t): t is SpotifyTrackItem => t !== null);
}

export async function fetchSpotifyPlaylistsWithTracks(
  accessToken: string,
  playlistIds?: string[]
): Promise<SpotifyPlaylistWithTracks[]> {
  const allPlaylists = await fetchPaginatedItems(
    accessToken,
    "https://api.spotify.com/v1/me/playlists?limit=50",
    100
  );

  const filterSet = playlistIds && playlistIds.length > 0 ? new Set(playlistIds) : null;
  const selected = allPlaylists.filter((p) => p?.id && (!filterSet || filterSet.has(p.id)));

  const results: SpotifyPlaylistWithTracks[] = [];
  for (const pl of selected) {
    const rawTracks = await fetchPaginatedItems(
      accessToken,
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(pl.id)}/tracks?limit=50`
    );
    results.push({
      id: String(pl.id),
      name: String(pl.name || "Imported Playlist"),
      description: pl.description ? String(pl.description) : null,
      coverUrl: pl.images?.[0]?.url ?? null,
      tracks: rawTracks.map(mapSpotifyTrack).filter((t): t is SpotifyTrackItem => t !== null),
    });
  }

  return results;
}
