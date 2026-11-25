import { InnerTubeClientName } from '../types';
import type { ClientWalkResult } from './clientWalk';

export const CLIENT_WALK_PRIORITY: readonly InnerTubeClientName[] = [
  'VISIONOS',
  'IOS',
  'ANDROID_MUSIC',
  'WEB_REMIX',
  'WEB',
  'MWEB',
] as const;

export const BENCH_DURATION_MS = 30 * 1000; // 30 seconds transient bench (not 10 minutes)
const LOCAL_STORAGE_KEY = 'mp_verdict_cache';

export interface VerdictEntry {
  benchedUntil: number;
  reason: string;
}

/**
 * VerdictCache manages in-memory benching of clients
 */
export class VerdictCache {
  private inMemoryCache: Map<InnerTubeClientName, VerdictEntry> = new Map();

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      // Clear legacy stale benches from localStorage so users never get locked out
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  private persistToStorage(): void {
    // In-memory only to avoid persistent lockouts across page reloads
  }

  /**
   * Check if a given client is currently benched
   */
  isBenched(client: InnerTubeClientName): boolean {
    const entry = this.inMemoryCache.get(client);
    if (!entry) return false;

    if (Date.now() < entry.benchedUntil) {
      return true;
    }

    // Expired bench
    this.inMemoryCache.delete(client);
    this.persistToStorage();
    return false;
  }

  /**
   * Bench a client for 10 minutes with a failure reason
   */
  bench(client: InnerTubeClientName, reason: string): void {
    const benchedUntil = Date.now() + BENCH_DURATION_MS;
    this.inMemoryCache.set(client, { benchedUntil, reason });
    this.persistToStorage();
  }

  /**
   * Remove bench for a single client
   */
  unbench(client: InnerTubeClientName): void {
    this.inMemoryCache.delete(client);
    this.persistToStorage();
  }

  /**
   * Clear all benched verdicts
   */
  clear(): void {
    this.inMemoryCache.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Get active (non-benched) clients in priority order
   */
  getActiveClients(): InnerTubeClientName[] {
    return CLIENT_WALK_PRIORITY.filter((client) => !this.isBenched(client));
  }

  /**
   * Retrieve snapshot of all verdicts
   */
  getAllVerdicts(): Record<InnerTubeClientName, VerdictEntry | null> {
    const result = {} as Record<InnerTubeClientName, VerdictEntry | null>;
    for (const client of CLIENT_WALK_PRIORITY) {
      result[client] = this.isBenched(client) ? this.inMemoryCache.get(client)! : null;
    }
    return result;
  }
}

// 10-minute in-memory cache for resolved stream URLs
export const STREAM_CACHE_TTL_MS = 10 * 60 * 1000;

export interface CachedStreamEntry {
  expiresAt: number;
  result: ClientWalkResult;
}

export const streamResultCache = new Map<string, CachedStreamEntry>();
export const inFlightPrefetches = new Set<string>();

/**
 * Check if a stream for videoId is already cached in-memory and valid
 */
export function isStreamCached(videoId: string): boolean {
  const cached = streamResultCache.get(videoId);
  return Boolean(cached && cached.expiresAt > Date.now());
}

/**
 * Invalidate in-memory stream cache for a specific videoId or all tracks
 */
export function invalidateStreamCache(videoId?: string): void {
  if (videoId) {
    streamResultCache.delete(videoId);
    inFlightPrefetches.delete(videoId);
  } else {
    streamResultCache.clear();
    inFlightPrefetches.clear();
  }
}
