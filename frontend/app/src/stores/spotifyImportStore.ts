'use client';

import { create } from 'zustand';
import { type ToastOptions } from '@mp/dying';
import { useLibraryStore } from './libraryStore';

export interface ImportJobState {
  id: string;
  kind: 'liked_songs' | 'playlists';
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: number;
  stats?: {
    total?: number;
    processed?: number;
    matched?: number;
    unmatched?: number;
    unmatchedTracks?: string[];
  };
  error?: string | null;
}

type ToastFn = (opts: ToastOptions) => void;

interface SpotifyImportStoreState {
  isModalOpen: boolean;
  loadingStatus: boolean;
  configured: boolean;
  connected: boolean;
  job: ImportJobState | null;
  error: string | null;
  setModalOpen: (open: boolean) => void;
  setToastFn: (fn: ToastFn) => void;
  checkStatus: () => Promise<void>;
  connectSpotify: () => Promise<void>;
  disconnectSpotify: () => Promise<void>;
  startImport: (kind: 'liked_songs' | 'playlists', playlistUrl?: string) => Promise<void>;
}

let activeEventSource: EventSource | null = null;
let toastHandler: ToastFn | null = null;

function notify(opts: ToastOptions) {
  toastHandler?.(opts);
}

export const useSpotifyImportStore = create<SpotifyImportStoreState>((set, get) => ({
  isModalOpen: false,
  loadingStatus: false,
  configured: true,
  connected: false,
  job: null,
  error: null,

  setToastFn: (fn) => {
    toastHandler = fn;
  },

  setModalOpen: (open) => {
    const prev = get().isModalOpen;
    const job = get().job;
    set({ isModalOpen: open });
    if (prev && !open && (job?.status === 'queued' || job?.status === 'running')) {
      notify({
        title: 'Importing songs in the background',
        description: "We'll notify you as soon as your Spotify import finishes.",
        variant: 'default',
      });
    }
  },

  checkStatus: async () => {
    set({ loadingStatus: true, error: null });
    try {
      const res = await fetch('/api/auth/spotify/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        set({ configured: Boolean(data.configured), connected: Boolean(data.connected) });
      }
    } catch {
      set({ error: 'Could not reach Spotify auth status endpoint.' });
    } finally {
      set({ loadingStatus: false });
    }
  },

  connectSpotify: async () => {
    set({ error: null });
    try {
      const res = await fetch('/api/auth/spotify/start?mode=json', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.authorizeUrl) {
        set({ error: data?.error || 'Failed to start Spotify OAuth' });
        return;
      }
      window.location.href = data.authorizeUrl;
    } catch {
      set({ error: 'Failed to start Spotify OAuth.' });
    }
  },

  disconnectSpotify: async () => {
    await fetch('/api/auth/spotify/disconnect', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    set({ connected: false, job: null });
  },

  startImport: async (kind, playlistUrl) => {
    set({ error: null });
    activeEventSource?.close();
    activeEventSource = null;

    try {
      const res = await fetch('/api/import/spotify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlistUrl ? { kind: 'playlists', playlistUrl } : { kind }),
      });
      const data = await res.json();
      if (!res.ok || !data.job) {
        set({ error: data?.error || 'Failed to queue Spotify import' });
        return;
      }

      set({ job: data.job });
      const es = new EventSource(`/api/import/${data.job.id}/events`, { withCredentials: true });
      activeEventSource = es;

      es.onmessage = (evt) => {
        try {
          const nextJob = JSON.parse(evt.data) as ImportJobState;
          set({ job: nextJob });
          if (nextJob.status === 'done') {
            es.close();
            activeEventSource = null;
            useLibraryStore.getState().fetchLibrary().catch(() => {});
            notify({
              title: 'Spotify import complete',
              description: `Matched ${nextJob.stats?.matched ?? 0} of ${nextJob.stats?.total ?? 0} tracks.`,
              variant: 'success',
            });
          } else if (nextJob.status === 'failed') {
            es.close();
            activeEventSource = null;
            notify({
              title: 'Spotify import failed',
              description: nextJob.error || 'Could not complete Spotify import.',
              variant: 'error',
            });
          }
        } catch {
          // Ignore malformed SSE payload
        }
      };

      es.onerror = () => {
        es.close();
        activeEventSource = null;
      };
    } catch {
      set({ error: 'Failed to start Spotify import.' });
    }
  },
}));
