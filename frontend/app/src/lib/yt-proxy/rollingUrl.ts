import { isValidVideoId } from './streamTarget';

const PLAYER_ENDPOINT =
  'https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false';
const IOS_USER_AGENT =
  'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X; US)';
const SLOT_SECONDS = 45;
const URL_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 500;

interface CacheEntry {
  url: string;
  expiresAt: number;
}

/**
 * Bounded cache of refreshed stream URLs. Every entry shares the same TTL, so
 * insertion order is also expiry order and eviction only has to look at the
 * oldest entries.
 */
export class RollingUrlCache {
  private entries = new Map<string, CacheEntry>();

  constructor(private readonly maxEntries = MAX_ENTRIES) {}

  get size(): number {
    return this.entries.size;
  }

  get(key: string, now = Date.now()): string | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return null;
    }
    return entry.url;
  }

  set(key: string, url: string, now = Date.now()): void {
    this.entries.delete(key);
    this.entries.set(key, { url, expiresAt: now + URL_TTL_MS });
    for (const [oldKey, entry] of this.entries) {
      if (entry.expiresAt > now && this.entries.size <= this.maxEntries) break;
      this.entries.delete(oldKey);
    }
  }
}

const rollingUrlCache = new RollingUrlCache();

interface StreamingFormat {
  itag?: number;
  url?: string;
}

/** Returns the url of exactly the requested itag, never another format. */
export function selectItagUrl(streamingData: unknown, itag: number): string | null {
  const data = streamingData as
    | { formats?: StreamingFormat[]; adaptiveFormats?: StreamingFormat[] }
    | undefined;
  const formats = [...(data?.formats ?? []), ...(data?.adaptiveFormats ?? [])];
  const match = formats.find((f) => f.itag === itag && typeof f.url === 'string' && f.url);
  return match?.url ?? null;
}

const ROLLING_CLIENTS = [
  {
    name: 'IOS',
    userAgent: IOS_USER_AGENT,
    client: {
      clientName: 'iOS',
      clientVersion: '20.11.6',
      hl: 'en',
      gl: 'US',
      deviceMake: 'Apple',
      osName: 'iOS',
      platform: 'MOBILE',
    },
  },
  {
    name: 'VISIONOS',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    client: {
      clientName: 'VISIONOS',
      clientVersion: '0.1',
      hl: 'en',
      gl: 'US',
      deviceMake: 'Apple',
      osName: 'visionOS',
      platform: 'MOBILE',
    },
  },
  {
    name: 'TVHTML5',
    userAgent: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 TV Safari/537.36',
    client: {
      clientName: 'TVHTML5',
      clientVersion: '7.20260707.07.00',
      hl: 'en',
      gl: 'US',
      deviceMake: 'Samsung',
      deviceModel: 'SmartTV',
      osName: 'Tizen',
      platform: 'TV',
    },
  },
] as const;

export async function getFreshRollingUrl(
  videoId: string,
  itag: number,
  startByte: number,
  cache: RollingUrlCache = rollingUrlCache,
  _preferFallback = ''
): Promise<string | null> {
  if (!isValidVideoId(videoId)) return null;

  const bytesPerSec = itag === 140 ? 16000 : 6000;
  const estimatedSec = Math.max(0, Math.floor(startByte / bytesPerSec));
  const cacheKey = `${videoId}:${itag}:${Math.floor(estimatedSec / SLOT_SECONDS)}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  for (const candidate of ROLLING_CLIENTS) {
    try {
      const res = await fetch(PLAYER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'User-Agent': candidate.userAgent },
        body: JSON.stringify({
          context: { client: candidate.client },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
          startTimeSecs: estimatedSec,
        }),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const url = selectItagUrl(data.streamingData, itag);
      if (url) {
        cache.set(cacheKey, url);
        return url;
      }
    } catch {
      // Try next client
    }
  }
  return null;
}
