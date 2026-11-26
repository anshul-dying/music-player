import {
  PlayerEngine,
  DevProxyAdapter,
  WebExtensionAdapter,
  NativeHttpAdapter,
  NetworkAdapter,
  Track,
  ShelfItemData,
} from '@mp/player-core';
import { type LyricsResponse } from '@mp/api-contract';
import { type NetworkAdapterType, type PlayerStoreState } from './types';

let sharedEngine: PlayerEngine | null = null;
let sharedMediaElement: HTMLMediaElement | null = null;

export function getSharedEngine(): PlayerEngine | null {
  return sharedEngine;
}

export function setSharedEngine(engine: PlayerEngine | null) {
  sharedEngine = engine;
}

export function getSharedMediaElement(): HTMLMediaElement | null {
  return sharedMediaElement;
}

export function setSharedMediaElement(el: HTMLMediaElement | null) {
  sharedMediaElement = el;
}

export function resolveSharedMediaElement(mediaElement?: HTMLMediaElement): HTMLMediaElement | null {
  const resolved =
    mediaElement ||
    sharedMediaElement ||
    (typeof document !== 'undefined' ? (document.getElementById('mp-global-audio') as HTMLMediaElement | null) : null);
  if (resolved) sharedMediaElement = resolved;
  return resolved;
}

export function createNetworkAdapter(type: NetworkAdapterType): NetworkAdapter {
  switch (type) {
    case 'dev-proxy':
      return new DevProxyAdapter({ proxyBaseUrl: '/api/yt' });
    case 'web-extension':
      return new WebExtensionAdapter();
    case 'native-http':
      return new NativeHttpAdapter();
    default:
      return new DevProxyAdapter({ proxyBaseUrl: '/api/yt' });
  }
}

export function updateBufferStatus(
  mediaEl: HTMLMediaElement | null,
  currentTime: number,
  duration: number,
  set: (state: Partial<PlayerStoreState>) => void
) {
  if (!mediaEl || !mediaEl.buffered || mediaEl.buffered.length === 0) {
    return;
  }
  let ahead = 0;
  let maxEnd = 0;
  for (let i = 0; i < mediaEl.buffered.length; i++) {
    const start = mediaEl.buffered.start(i);
    const end = mediaEl.buffered.end(i);
    if (end > maxEnd) maxEnd = end;
    if (currentTime >= start && currentTime <= end) {
      ahead = Math.max(0, end - currentTime);
    }
  }
  const dur = duration || mediaEl.duration || 0;
  const percent = dur > 0 ? Math.min(100, (maxEnd / dur) * 100) : 0;
  set({
    bufferedAheadSeconds: parseFloat(ahead.toFixed(1)),
    bufferedPercent: parseFloat(percent.toFixed(1)),
  });
}

export const ITAG_METADATA: Record<number, { bitrate: number; sampleRate: number; codec: string }> = {
  251: { bitrate: 160000, sampleRate: 48000, codec: 'Opus 48kHz (itag 251)' },
  250: { bitrate: 70000, sampleRate: 48000, codec: 'Opus 48kHz (itag 250)' },
  249: { bitrate: 50000, sampleRate: 48000, codec: 'Opus 48kHz (itag 249)' },
  140: { bitrate: 128000, sampleRate: 44100, codec: 'AAC 44.1kHz (itag 140)' },
  141: { bitrate: 256000, sampleRate: 44100, codec: 'AAC 44.1kHz (itag 141)' },
  139: { bitrate: 48000, sampleRate: 44100, codec: 'AAC 44.1kHz (itag 139)' },
};

export const lyricsCache = new Map<string, LyricsResponse>();
export const relatedCache = new Map<string, ShelfItemData[]>();
let lyricsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedFetchLyrics(
  track: Track | null,
  fetchFn: (track: Track) => Promise<LyricsResponse | null>,
  delay = 250
) {
  if (lyricsDebounceTimer) {
    clearTimeout(lyricsDebounceTimer);
    lyricsDebounceTimer = null;
  }
  if (!track || !track.videoId) return;

  if (lyricsCache.has(track.videoId)) {
    fetchFn(track);
    return;
  }

  lyricsDebounceTimer = setTimeout(() => {
    fetchFn(track);
  }, delay);
}
