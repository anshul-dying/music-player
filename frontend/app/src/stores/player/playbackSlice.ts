import {
  PlayerEngine,
  Track,
  RepeatMode,
} from '@mp/player-core';
import { type LyricsResponse } from '@mp/api-contract';
import {
  type StoreSet,
  type StoreGet,
  type SleepTimerMode,
  type NetworkAdapterType,
} from './types';
import {
  getSharedEngine,
  setSharedEngine,
  getSharedMediaElement,
  resolveSharedMediaElement,
  createNetworkAdapter,
  lyricsCache,
  debouncedFetchLyrics,
} from './engineContext';
import { bindEngineEvents } from './engineEvents';
import { handleSleepTimer, fetchLyricsService } from './playbackServices';

export const createPlaybackSlice = (set: StoreSet, get: StoreGet) => ({
  engine: null as PlayerEngine | null,
  isInitialized: false,
  playbackState: 'idle' as const,
  playbackRate: 1.0,
  currentTrack: null as Track | null,
  currentIndex: -1,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  isMuted: false,
  repeatMode: 'off' as RepeatMode,
  isShuffle: false,
  infiniteRadio: true,
  sleepTimerMode: 'off' as SleepTimerMode,
  sleepTimerRemaining: null as number | null,
  lyrics: null as LyricsResponse | null,
  isLyricsLoading: false,
  lyricsError: null as string | null,
  error: null as string | null,

  initialize: (mediaElement?: HTMLMediaElement) => {
    if (typeof window === 'undefined') return;

    if (get().isInitialized && getSharedEngine()) {
      return;
    }

    resolveSharedMediaElement(mediaElement);
    const hasExtension = Boolean((window as any).__MP_EXTENSION_ACTIVE__);
    const adapterType: NetworkAdapterType =
      get().networkAdapterType || (hasExtension ? 'web-extension' : 'dev-proxy');
    const adapter = createNetworkAdapter(adapterType);

    if (!(window as any).__MP_EXT_LISTENER_BOUND__) {
      (window as any).__MP_EXT_LISTENER_BOUND__ = true;
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'MP_EXTENSION_READY') {
          get().setNetworkAdapterType('web-extension');
        }
      });
    }

    const engine = new PlayerEngine({
      networkAdapter: adapter,
      mediaElement: getSharedMediaElement() || undefined,
    });
    setSharedEngine(engine);

    bindEngineEvents(engine, set, get);
    engine.setVolume(get().volume);
    if (typeof (engine as any).setPlaybackRate === 'function') {
      (engine as any).setPlaybackRate(get().playbackRate);
    }

    set({
      engine,
      isInitialized: true,
      networkAdapterType: adapterType,
      streamingStatus: adapterType === 'web-extension' ? 'Direct CDN via Extension' : 'Edge Fallback Proxy',
      activeClient: engine.getActiveClient(),
      queue: engine.getQueue(),
    });
  },

  playTrack: async (track: Track) => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = getSharedEngine();
    }
    if (!engine) return;

    const prevTrack = get().currentTrack;
    const isNew = !prevTrack || prevTrack.videoId !== track.videoId;
    const cached = track.videoId ? lyricsCache.get(track.videoId) : null;
    set({
      currentTrack: track,
      ...(isNew ? { currentTime: 0, bufferedAheadSeconds: 0, bufferedPercent: 0 } : {}),
      playbackState: 'playing',
      error: null,
      lyrics: cached || null,
      isLyricsLoading: track.videoId ? !cached : false,
      lyricsError: null,
    });

    debouncedFetchLyrics(track, get().fetchLyrics);
    if (track.videoId && get().queue.length <= 1) get().getNextRadio(track.videoId).catch(() => {});

    try {
      await engine.playTrack(track);
    } catch (err: any) {
      set({ playbackState: 'idle', error: err?.message || 'Failed to play track' });
    }
  },

  play: async (index?: number) => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = getSharedEngine();
    }
    if (!engine) return;

    set({ playbackState: 'playing', error: null });
    try {
      await engine.play(index);
    } catch (err: any) {
      set({ playbackState: 'paused', error: err?.message || 'Playback failed' });
    }
  },

  pause: async () => {
    set({ playbackState: 'paused' });
    const engine = get().engine || getSharedEngine();
    if (engine) {
      try {
        await engine.pause();
      } catch {
        // Ignored
      }
    }
  },

  togglePlay: async () => {
    let engine = get().engine || getSharedEngine();
    if (!engine) {
      get().initialize();
      engine = getSharedEngine();
    }
    if (!engine) return;

    const isCurrentlyPlaying = get().playbackState === 'playing' || !engine.getAudioDriver()?.isPaused();
    if (isCurrentlyPlaying) {
      set({ playbackState: 'paused' });
      try {
        await engine.pause();
      } catch {
        set({ playbackState: 'playing' });
      }
    } else {
      set({ playbackState: 'playing', error: null });
      try {
        if (engine.getCurrentTrack()) {
          await engine.play();
        } else if (get().queue.length > 0) {
          await engine.play(0);
        } else if (get().currentTrack) {
          await engine.playTrack(get().currentTrack!);
        }
      } catch (err: any) {
        set({ playbackState: 'paused', error: err?.message || 'Playback failed' });
      }
    }
  },

  seek: async (seconds: number) => {
    const engine = get().engine || getSharedEngine();
    if (engine) {
      set({ currentTime: seconds });
      await engine.seek(seconds);
    }
  },

  next: async () => {
    const engine = get().engine || getSharedEngine();
    if (engine) {
      set({ currentTime: 0, bufferedAheadSeconds: 0, bufferedPercent: 0 });
      if (!engine.hasNext() && get().infiniteRadio && get().repeatMode === 'off') {
        const cur = get().currentTrack || engine.getCurrentTrack();
        if (cur?.videoId) await get().getNextRadio(cur.videoId).catch(() => {});
      }
      try {
        await engine.next();
      } catch (err: any) {
        console.warn('[PlayerStore] Error playing next track:', err);
        set({ error: err?.message || 'Track playback failed' });
        const q = engine.getQueue();
        const idx = engine.getCurrentIndex();
        if (idx < q.length - 1) {
          get().next().catch(() => {});
        }
      }
      const current = engine.getCurrentTrack();
      if (current) {
        const cached = current.videoId ? lyricsCache.get(current.videoId) : null;
        set({
          lyrics: cached || null,
          isLyricsLoading: current.videoId ? !cached : false,
          lyricsError: null,
        });
        debouncedFetchLyrics(current, get().fetchLyrics);
      }
    }
  },

  previous: async () => {
    const engine = get().engine || getSharedEngine();
    if (engine) {
      set({ currentTime: 0, bufferedAheadSeconds: 0, bufferedPercent: 0 });
      try {
        await engine.previous();
      } catch (err: any) {
        console.warn('[PlayerStore] Error playing previous track:', err);
        set({ error: err?.message || 'Track playback failed' });
      }
      const current = engine.getCurrentTrack();
      if (current) {
        const cached = current.videoId ? lyricsCache.get(current.videoId) : null;
        set({
          lyrics: cached || null,
          isLyricsLoading: current.videoId ? !cached : false,
          lyricsError: null,
        });
        debouncedFetchLyrics(current, get().fetchLyrics);
      }
    }
  },

  setVolume: (volume: number) => {
    const engine = get().engine || getSharedEngine();
    const clamped = Math.max(0, Math.min(1, volume));
    if (engine) engine.setVolume(clamped);
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    const { isMuted, volume } = get();
    const engine = get().engine || getSharedEngine();
    const target = isMuted ? (volume === 0 ? 0.75 : volume) : 0;
    if (engine) engine.setVolume(target);
    set({ isMuted: !isMuted, ...(isMuted ? { volume: target } : {}) });
  },

  setRepeatMode: (mode: RepeatMode) => {
    get().engine?.setRepeatMode(mode);
    set({ repeatMode: mode });
  },

  toggleRepeat: () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(get().repeatMode) + 1) % modes.length];
    get().setRepeatMode(nextMode);
  },

  setShuffle: (shuffle: boolean) => {
    get().engine?.setShuffle(shuffle);
    set({ isShuffle: shuffle });
  },

  toggleShuffle: () => {
    get().setShuffle(!get().isShuffle);
  },

  toggleInfiniteRadio: (enabled?: boolean) => {
    set({ infiniteRadio: typeof enabled === 'boolean' ? enabled : !get().infiniteRadio });
  },

  setPlaybackRate: (rate: number) => {
    const engine = get().engine || getSharedEngine();
    if (engine && typeof (engine as any).setPlaybackRate === 'function') {
      (engine as any).setPlaybackRate(rate);
    }
    const driver = engine?.getAudioDriver?.() as any;
    const mediaEl = getSharedMediaElement() || driver?.mediaElement;
    if (mediaEl && mediaEl.playbackRate !== rate) {
      mediaEl.playbackRate = rate;
    }
    set({ playbackRate: rate });
  },

  setSleepTimer: (mode: SleepTimerMode) => handleSleepTimer(mode, set, get),
  fetchLyrics: (track: Track): Promise<LyricsResponse | null> => fetchLyricsService(track, set, get),
});
