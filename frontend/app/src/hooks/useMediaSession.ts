'use client';

import { useEffect } from 'react';
import { getHighResArtworkUrl } from '@mp/dying';
import { usePlayerStore } from '../stores/playerStore';

export function useMediaSession(): void {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playbackState = usePlayerStore((s) => s.playbackState);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);

  // Sync Metadata when currentTrack changes
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (currentTrack) {
      const artwork: MediaImage[] = currentTrack.thumbnail
        ? [
            { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
            { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
            { src: getHighResArtworkUrl(currentTrack.thumbnail, 256), sizes: '256x256', type: 'image/jpeg' },
            { src: getHighResArtworkUrl(currentTrack.thumbnail, 512), sizes: '512x512', type: 'image/jpeg' },
            { src: getHighResArtworkUrl(currentTrack.thumbnail, 1024), sizes: '1024x1024', type: 'image/jpeg' },
          ]
        : [];

      if (typeof MediaMetadata !== 'undefined') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title || 'Unknown Title',
          artist: currentTrack.artist || 'Unknown Artist',
          album: currentTrack.album || 'YouTube Music',
          artwork,
        });
      }
    } else {
      navigator.mediaSession.metadata = null;
    }
  }, [currentTrack]);

  // Sync Playback State
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      if (playbackState === 'playing') {
        navigator.mediaSession.playbackState = 'playing';
      } else if (playbackState === 'paused') {
        navigator.mediaSession.playbackState = 'paused';
      } else {
        navigator.mediaSession.playbackState = 'none';
      }
    } catch {
      // Ignore unsupported browser quirks
    }
  }, [playbackState]);

  // Sync Position State
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!('setPositionState' in navigator.mediaSession)) return;

    if (
      duration > 0 &&
      Number.isFinite(duration) &&
      Number.isFinite(currentTime) &&
      currentTime >= 0
    ) {
      try {
        const position = Math.min(Math.max(0, currentTime), duration);
        navigator.mediaSession.setPositionState({
          duration,
          position,
          playbackRate: 1,
        });
      } catch {
        // MediaSession position validation may fail if position > duration
      }
    }
  }, [currentTime, duration]);

  // Register MediaSession Action Handlers
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const actionHandlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      [
        'play',
        () => {
          const store = usePlayerStore.getState();
          if (store.togglePlay) {
            store.togglePlay();
          } else {
            store.play();
          }
        },
      ],
      [
        'pause',
        () => {
          usePlayerStore.getState().pause();
        },
      ],
      [
        'previoustrack',
        () => {
          usePlayerStore.getState().previous();
        },
      ],
      [
        'nexttrack',
        () => {
          usePlayerStore.getState().next();
        },
      ],
      [
        'seekto',
        (details) => {
          if (details.seekTime != null) {
            usePlayerStore.getState().seek(details.seekTime);
          }
        },
      ],
      [
        'seekbackward',
        (details) => {
          const store = usePlayerStore.getState();
          const offset = details.seekOffset ?? 10;
          store.seek(Math.max(0, store.currentTime - offset));
        },
      ],
      [
        'seekforward',
        (details) => {
          const store = usePlayerStore.getState();
          const offset = details.seekOffset ?? 10;
          store.seek(Math.min(store.duration, store.currentTime + offset));
        },
      ],
      [
        'stop',
        () => {
          usePlayerStore.getState().pause();
        },
      ],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some action types might not be supported across all browsers
      }
    }

    return () => {
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);
}
