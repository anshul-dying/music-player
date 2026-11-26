import { type PlayerEngine, type QueueFilterChip, Track } from '@mp/player-core';
import { type LyricsResponse } from '@mp/api-contract';
import {
  type StoreSet,
  type StoreGet,
  type SleepTimerMode,
} from './types';
import { lyricsCache } from './engineContext';

const FALLBACK_QUEUE_CHIP_PARAMS: Record<string, string | undefined> = {
  All: undefined,
  Familiar: 'wAEB8gECKAE%3D',
  Discover: 'wAEB8gECKAI%3D',
  Popular: 'wAEB8gECKAU%3D',
  'Deep cuts': 'wAEB8gECKAM%3D',
};

export async function applyQueueFilterService(
  engine: PlayerEngine,
  filter: string,
  currentTrack: Track | null,
  currentIndex: number,
  queueFilterChips: QueueFilterChip[],
  set: StoreSet
): Promise<void> {
  set({ queueFilter: filter });
  if (!currentTrack?.videoId) return;

  const matched = queueFilterChips.find((c) => c.label.toLowerCase() === filter.toLowerCase());
  const params = matched?.params ?? FALLBACK_QUEUE_CHIP_PARAMS[filter];
  const radioData = await engine.getNextRadio(currentTrack.videoId, matched?.playlistId, params);
  if (radioData.chips?.length) {
    set({ queueFilterChips: radioData.chips });
  }
  const existingQueue = engine.getQueue();
  const idx = currentIndex >= 0 && currentIndex < existingQueue.length ? currentIndex : 0;
  const keptPrefix = existingQueue.slice(0, idx + 1);
  const keptIds = new Set(keptPrefix.map((t) => t.videoId || t.id));
  const nextTracks = radioData.queue.filter((t) => !keptIds.has(t.videoId || t.id));
  if (nextTracks.length > 0 || filter === 'All') {
    engine.setQueue([...keptPrefix, ...nextTracks], idx, false);
  }
}

let sleepTimerInterval: ReturnType<typeof setInterval> | null = null;

export function handleSleepTimer(
  mode: SleepTimerMode,
  set: StoreSet,
  get: StoreGet
) {
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
    sleepTimerInterval = null;
  }
  if (mode === 'off' || mode === 'end_of_track') {
    set({ sleepTimerMode: mode, sleepTimerRemaining: null });
    return;
  }
  const durationMap: Record<SleepTimerMode, number> = {
    off: 0,
    '15m': 15 * 60,
    '30m': 30 * 60,
    '45m': 45 * 60,
    '60m': 60 * 60,
    end_of_track: 0,
  };
  const initialSeconds = durationMap[mode] || 0;
  set({ sleepTimerMode: mode, sleepTimerRemaining: initialSeconds });

  sleepTimerInterval = setInterval(() => {
    const remaining = get().sleepTimerRemaining;
    if (remaining === null || remaining <= 1) {
      if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
      }
      set({ sleepTimerMode: 'off', sleepTimerRemaining: null });
      get().pause().catch(() => {});
    } else {
      set({ sleepTimerRemaining: remaining - 1 });
    }
  }, 1000);
}

export async function fetchLyricsService(
  track: Track,
  set: StoreSet,
  get: StoreGet
): Promise<LyricsResponse | null> {
  if (!track || !track.videoId) {
    set({ lyrics: null, isLyricsLoading: false, lyricsError: null });
    return null;
  }

  if (lyricsCache.has(track.videoId)) {
    const cached = lyricsCache.get(track.videoId)!;
    set({ lyrics: cached, isLyricsLoading: false, lyricsError: null });
    return cached;
  }

  set({ isLyricsLoading: true, lyricsError: null });

  try {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    const durationSec = track.duration || 0;
    const url = `${apiUrl}/api/lyrics?videoId=${encodeURIComponent(track.videoId)}&title=${encodeURIComponent(track.title || '')}&artist=${encodeURIComponent(track.artist || '')}&durationSec=${durationSec}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch lyrics: HTTP ${res.status}`);
    const data: LyricsResponse = await res.json();
    lyricsCache.set(track.videoId, data);

    const current = get().currentTrack;
    if (current && (current.videoId === track.videoId || current.id === track.id)) {
      set({ lyrics: data, isLyricsLoading: false, lyricsError: null });
    }
    return data;
  } catch (err: any) {
    const msg = err?.message || 'Failed to load lyrics';
    const current = get().currentTrack;
    if (current && (current.videoId === track.videoId || current.id === track.id)) {
      set({ lyrics: null, isLyricsLoading: false, lyricsError: msg });
    }
    return null;
  }
}
