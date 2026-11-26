'use client';

import { create } from 'zustand';
import { type Track, WebExtensionAdapter, InnerTubeClient } from '@mp/player-core';
import { useYouTubeAuthStore } from './youtubeAuthStore';
import {
  type Playlist,
  type PlayHistoryItem,
  type LibraryState,
} from './library/types';
import {
  fetchLibraryData,
  likeTrackApi,
  unlikeTrackApi,
  createPlaylistApi,
  deletePlaylistApi,
  addTracksToPlaylistApi,
  removeTrackFromPlaylistApi,
  recordPlayHistoryApi,
  fetchPlaylistTracksApi,
} from './library/libraryApi';

export type { Playlist, PlayHistoryItem, LibraryState };

const HISTORY_LIMIT = 100;

export const useLibraryStore = create<LibraryState>((set, get) => ({
  likedVideoIds: new Set<string>(),
  likedTracks: [],
  playlists: [],
  history: [],
  isLoading: false,

  fetchLibrary: async () => {
    set({ isLoading: true });
    try {
      const data = await fetchLibraryData();
      set({
        likedVideoIds: data.likedVideoIds,
        likedTracks: data.likedTracks,
        playlists: data.playlists,
        history: data.history,
      });
    } catch (err) {
      console.warn('Failed to fetch library:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  resetLibrary: () => {
    set({
      likedVideoIds: new Set<string>(),
      likedTracks: [],
      playlists: [],
      history: [],
      isLoading: false,
    });
  },

  isLiked: (videoId: string): boolean => {
    if (!videoId) return false;
    return get().likedVideoIds.has(videoId);
  },

  toggleLike: async (track: Track) => {
    const vid = track.videoId || track.id;
    if (!vid) return;

    const currentLikedIds = new Set(get().likedVideoIds);
    const currentTracks = [...get().likedTracks];
    const currentlyLiked = currentLikedIds.has(vid);

    // Optimistic update
    if (currentlyLiked) {
      currentLikedIds.delete(vid);
      const nextTracks = currentTracks.filter((t) => (t.videoId || t.id) !== vid);
      set({ likedVideoIds: currentLikedIds, likedTracks: nextTracks });

      try {
        const ok = await unlikeTrackApi(vid);
        if (!ok) {
          const rollbackIds = new Set(get().likedVideoIds);
          rollbackIds.add(vid);
          set({ likedVideoIds: rollbackIds, likedTracks: currentTracks });
        } else if (useYouTubeAuthStore.getState().isYouTubeAuthenticated) {
          try {
            const client = new InnerTubeClient({ networkAdapter: new WebExtensionAdapter() });
            client.setLikeStatus(vid, 'INDIFFERENT').catch(() => {});
          } catch {
            // Ignore background sync errors
          }
        }
      } catch (err) {
        console.warn('Failed to unlike track:', err);
        const rollbackIds = new Set(get().likedVideoIds);
        rollbackIds.add(vid);
        set({ likedVideoIds: rollbackIds, likedTracks: currentTracks });
      }
    } else {
      currentLikedIds.add(vid);
      const nextTracks = [track, ...currentTracks];
      set({ likedVideoIds: currentLikedIds, likedTracks: nextTracks });

      try {
        const ok = await likeTrackApi(track);
        if (!ok) {
          const rollbackIds = new Set(get().likedVideoIds);
          rollbackIds.delete(vid);
          set({ likedVideoIds: rollbackIds, likedTracks: currentTracks });
        } else if (useYouTubeAuthStore.getState().isYouTubeAuthenticated) {
          try {
            const client = new InnerTubeClient({ networkAdapter: new WebExtensionAdapter() });
            client.setLikeStatus(vid, 'LIKE').catch(() => {});
          } catch {
            // Ignore background sync errors
          }
        }
      } catch (err) {
        console.warn('Failed to like track:', err);
        const rollbackIds = new Set(get().likedVideoIds);
        rollbackIds.delete(vid);
        set({ likedVideoIds: rollbackIds, likedTracks: currentTracks });
      }
    }
  },

  createPlaylist: async (name: string): Promise<Playlist | null> => {
    const created = await createPlaylistApi(name);
    if (created) {
      set((state) => ({
        playlists: [created, ...state.playlists],
      }));
      return created;
    }
    return null;
  },

  deletePlaylist: async (id: string): Promise<boolean> => {
    const ok = await deletePlaylistApi(id);
    if (ok) {
      set((state) => ({
        playlists: state.playlists.filter((p) => p.id !== id),
      }));
      return true;
    }
    return false;
  },

  addTracksToPlaylist: async (playlistId: string, tracks: Track[]): Promise<boolean> => {
    const added = await addTracksToPlaylistApi(playlistId, tracks);
    if (added === null) return false;
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === playlistId ? { ...p, trackCount: (p.trackCount || 0) + added } : p
      ),
    }));
    return true;
  },

  removeTrackFromPlaylist: async (playlistId: string, videoId: string): Promise<boolean> => {
    const ok = await removeTrackFromPlaylistApi(playlistId, videoId);
    if (ok) {
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? { ...p, trackCount: Math.max(0, (p.trackCount || 1) - 1) }
            : p
        ),
      }));
      return true;
    }
    return false;
  },

  recordPlayHistory: async (track: Track, msPlayed: number = 0): Promise<void> => {
    const item = await recordPlayHistoryApi(track, msPlayed);
    if (item) {
      set((state) => ({ history: [item, ...state.history].slice(0, HISTORY_LIMIT) }));
    }
  },

  fetchPlaylistTracks: async (playlistId: string): Promise<Track[]> => {
    return fetchPlaylistTracksApi(playlistId);
  },
}));
