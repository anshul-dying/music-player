import { PlayerEngine } from '@mp/player-core';
import { type StoreSet, type StoreGet } from './types';
import {
  getSharedMediaElement,
  updateBufferStatus,
  ITAG_METADATA,
  lyricsCache,
  relatedCache,
  debouncedFetchLyrics,
} from './engineContext';
import { createHistoryRecorder, recordPlay } from './historyRecorder';

export function bindEngineEvents(engine: PlayerEngine, set: StoreSet, get: StoreGet) {
  const history = createHistoryRecorder(recordPlay);

  engine.on('stateChange', (state) => {
    set({ playbackState: state, error: state === 'error' ? get().error : null });
    if (get().sleepTimerMode === 'end_of_track' && (state === 'idle' || state === 'ended')) {
      get().pause().catch(() => {});
      set({ sleepTimerMode: 'off', sleepTimerRemaining: null });
    }
  });

  if (typeof (engine as any).on === 'function') {
    (engine as any).on('playbackRateChange', (rate: number) => {
      if (rate > 0) set({ playbackRate: rate });
    });
  }

  let lastTrackVideoId: string | null = null;
  let pendingRadioVideoId: string | null = null;
  let pendingRadioPromise: Promise<unknown> | null = null;

  const ensureRadioTracks = (videoId: string) => {
    if (pendingRadioVideoId === videoId && pendingRadioPromise) {
      return pendingRadioPromise;
    }
    pendingRadioVideoId = videoId;
    const promise = get()
      .getNextRadio(videoId)
      .finally(() => {
        if (pendingRadioPromise === promise) {
          pendingRadioVideoId = null;
          pendingRadioPromise = null;
        }
      });
    pendingRadioPromise = promise;
    return promise;
  };

  engine.on('trackChange', (track, index) => {
    const isSameVideo = Boolean(track?.videoId && lastTrackVideoId === track.videoId);
    lastTrackVideoId = track?.videoId || null;
    history.trackChange(track);
    const cached = track?.videoId ? lyricsCache.get(track.videoId) : null;
    const cachedRelated = track?.videoId ? relatedCache.get(track.videoId) : null;
    set({
      currentTrack: track ? { ...track } : null,
      currentIndex: index,
      ...(isSameVideo ? {} : { currentTime: 0, bufferedAheadSeconds: 0, bufferedPercent: 0 }),
      lyrics: cached || null,
      isLyricsLoading: track ? !cached : false,
      lyricsError: null,
      ...(isSameVideo && !cachedRelated ? {} : { related: cachedRelated || [], relatedForVideoId: cachedRelated ? track?.videoId || null : null }),
    });

    const curRate = get().playbackRate > 0 ? get().playbackRate : 1;
    if (typeof (engine as any).setPlaybackRate === 'function') {
      (engine as any).setPlaybackRate(curRate);
    }
    const driver = engine.getAudioDriver() as any;
    const mediaEl = getSharedMediaElement() || driver?.mediaElement;
    if (mediaEl && mediaEl.playbackRate !== curRate) {
      mediaEl.playbackRate = curRate;
    }

    if (track && (!isSameVideo || !get().lyrics)) {
      debouncedFetchLyrics(track, get().fetchLyrics);
    }

    if (
      track?.videoId &&
      get().infiniteRadio &&
      get().repeatMode === 'off' &&
      index >= engine.getQueue().length - 1
    ) {
      ensureRadioTracks(track.videoId).catch(() => {});
    }
  });

  engine.on('timeUpdate', (time) => {
    set({ currentTime: time });
    history.timeUpdate(time, get().duration);
    const driver = engine.getAudioDriver() as any;
    const mediaEl = getSharedMediaElement() || driver?.mediaElement;
    updateBufferStatus(mediaEl, time, get().duration, set);
  });

  engine.on('durationChange', (dur) => set({ duration: dur }));
  engine.on('volumeChange', (vol) => set({ volume: vol, isMuted: vol === 0 }));
  engine.on('queueChange', (q) => set({ queue: [...q] }));

  engine.on('walkVerdict', (verdicts, selectedClient) => {
    const isOpus = selectedClient !== 'MWEB';
    const itag = isOpus ? 251 : 140;
    const meta = ITAG_METADATA[itag];
    set({
      verdicts: [...verdicts],
      activeClient: selectedClient,
      activeItag: itag,
      codec: isOpus ? 'Opus 48kHz (itag 251)' : 'AAC 44.1kHz (itag 140)',
      bitrate: meta?.bitrate ?? get().bitrate,
      sampleRate: meta?.sampleRate ?? get().sampleRate,
    });
  });

  engine.on('error', (err) => set({ error: err.message || 'Playback error occurred' }));
  engine.on('ended', () => {
    history.ended();
    set({ playbackState: 'ended' });
    if (get().sleepTimerMode === 'end_of_track') {
      get().pause().catch(() => {});
      set({ sleepTimerMode: 'off', sleepTimerRemaining: null });
      return;
    }
    if (get().infiniteRadio && get().repeatMode === 'off' && !engine.hasNext()) {
      const track = get().currentTrack || engine.getCurrentTrack();
      if (track?.videoId) {
        ensureRadioTracks(track.videoId)
          .then(() => {
            if (
              get().playbackState === 'ended' &&
              get().infiniteRadio &&
              get().repeatMode === 'off' &&
              engine.hasNext()
            ) {
              return get().next();
            }
          })
          .catch(() => {});
      }
    }
  });
}
