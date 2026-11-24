import { type SpotifyTrackItem } from "./spotifyApi.js";

export interface MatchedYtTrack {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  durationSec: number;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const setA = new Set(normalize(a).split(" ").filter(Boolean));
  const setB = new Set(normalize(b).split(" ").filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let hits = 0;
  for (const token of setA) {
    if (setB.has(token)) hits += 1;
  }
  return hits / Math.max(setA.size, setB.size);
}

function parseDurationSec(text: string): number {
  const parts = text.trim().split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function extractCandidates(data: any): MatchedYtTrack[] {
  const results: MatchedYtTrack[] = [];
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const el of node) walk(el);
      return;
    }
    const r = node.musicResponsiveListItemRenderer;
    if (r) {
      const cols = r.flexColumns || [];
      const titleRuns = cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const subRuns = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const videoId =
        r.playlistItemData?.videoId ||
        r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
          ?.playNavigationEndpoint?.watchEndpoint?.videoId ||
        titleRuns[0]?.navigationEndpoint?.watchEndpoint?.videoId;
      const title = titleRuns[0]?.text || "";
      if (videoId && title) {
        const subTexts = subRuns.map((s: any) => String(s?.text || "").trim()).filter(Boolean);
        const durText = subTexts.find((t: string) => /^\d+:\d{2}(:\d{2})?$/.test(t)) || "";
        const artist = subTexts.find((t: string) => t !== "•" && t !== durText && !/^(song|video)$/i.test(t)) || "";
        const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        results.push({
          videoId,
          title,
          artist,
          thumbnail: thumbs.length > 0 ? thumbs[thumbs.length - 1].url : null,
          durationSec: durText ? parseDurationSec(durText) : 0,
        });
      }
      return;
    }
    for (const key of Object.keys(node)) walk(node[key]);
  };
  walk(data);
  return results;
}

export function scoreCandidate(source: SpotifyTrackItem, candidate: MatchedYtTrack): number {
  const normSrcTitle = normalize(source.title);
  const normCandTitle = normalize(candidate.title);
  const titleScore =
    normSrcTitle && normCandTitle === normSrcTitle
      ? 1.0
      : tokenOverlap(source.title, candidate.title);

  const artistScore = tokenOverlap(source.artist, candidate.artist);

  let durationScore = 0.5;
  if (source.durationMs > 0 && candidate.durationSec > 0) {
    const deltaSec = Math.abs(source.durationMs / 1000 - candidate.durationSec);
    if (deltaSec <= 3) durationScore = 1.0;
    else if (deltaSec <= 10) durationScore = 0.75;
    else if (deltaSec <= 25) durationScore = 0.35;
    else durationScore = 0.0;
  }

  return titleScore * 0.5 + artistScore * 0.35 + durationScore * 0.15;
}

export async function matchSpotifyTrack(source: SpotifyTrackItem): Promise<MatchedYtTrack | null> {
  const primaryArtist = source.artist.split(",")[0]?.trim() || source.artist;
  const query = `${source.title} ${primaryArtist}`.trim();

  try {
    const res = await fetch("https://music.youtube.com/youtubei/v1/search?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-YouTube-Client-Name": "67",
        "X-YouTube-Client-Version": "1.20240724.01.00",
      },
      body: JSON.stringify({
        context: {
          client: { clientName: "WEB_REMIX", clientVersion: "1.20240724.01.00", hl: "en", gl: "US" },
        },
        query,
        params: "EgWKAQIIAWoMEAMQBBAJEAoQBRAV",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const candidates = extractCandidates(data);
    let best: MatchedYtTrack | null = null;
    let bestScore = -1;
    for (const candidate of candidates.slice(0, 5)) {
      const score = scoreCandidate(source, candidate);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return bestScore >= 0.42 ? best : null;
  } catch {
    return null;
  }
}
