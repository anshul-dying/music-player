import { createHash, randomBytes } from "node:crypto";
import { getDb, schema, decryptToken, encryptToken } from "@mp/db";
import { eq } from "drizzle-orm";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
].join(" ");

export function getSpotifyConfig() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || "";
  const port = process.env.PORT ?? "4000";
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI?.trim() ||
    `http://127.0.0.1:${port}/api/auth/spotify/callback`;
  const appOrigin = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",")[0].trim();
  return { clientId, clientSecret, redirectUri, appOrigin };
}

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function buildSpotifyAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const search = new URLSearchParams({
    client_id: params.clientId,
    response_type: "code",
    redirect_uri: params.redirectUri,
    state: params.state,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: params.codeChallenge,
    show_dialog: "true",
  });
  return `${SPOTIFY_AUTH_URL}?${search.toString()}`;
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
}

export async function exchangeSpotifyCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<SpotifyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
  });
  if (params.clientSecret) {
    body.set("client_secret", params.clientSecret);
  }

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Spotify token exchange failed (${res.status}): ${errText}`);
  }
  return (await res.json()) as SpotifyTokenResponse;
}

export async function refreshSpotifyToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<SpotifyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  });
  if (params.clientSecret) {
    body.set("client_secret", params.clientSecret);
  }

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Spotify token refresh failed (${res.status})`);
  }
  return (await res.json()) as SpotifyTokenResponse;
}

export async function getValidSpotifyAccessToken(userId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.spotifyTokens)
    .where(eq(schema.spotifyTokens.userId, userId))
    .limit(1);

  if (!row) return null;

  const accessToken = decryptToken(row.accessTokenEnc);
  if (row.expiresAt.getTime() > Date.now() + 60_000) {
    return accessToken;
  }

  const { clientId, clientSecret } = getSpotifyConfig();
  if (!clientId) return accessToken;

  const refreshToken = decryptToken(row.refreshTokenEnc);
  const refreshed = await refreshSpotifyToken({ clientId, clientSecret, refreshToken });
  const nextExpires = new Date(Date.now() + refreshed.expires_in * 1000);
  const nextRefresh = refreshed.refresh_token || refreshToken;

  await db
    .update(schema.spotifyTokens)
    .set({
      accessTokenEnc: encryptToken(refreshed.access_token),
      refreshTokenEnc: encryptToken(nextRefresh),
      expiresAt: nextExpires,
      scope: refreshed.scope ?? row.scope,
      updatedAt: new Date(),
    })
    .where(eq(schema.spotifyTokens.userId, userId));

  return refreshed.access_token;
}
