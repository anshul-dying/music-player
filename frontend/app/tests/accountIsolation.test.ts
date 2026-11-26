import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useLibraryStore } from '../src/stores/libraryStore';
import { useYouTubeAuthStore } from '../src/stores/youtubeAuthStore';

describe('Account switch library isolation (#78)', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
  });

  it('resetLibrary clears likedTracks, likedVideoIds, playlists, and history', () => {
    useLibraryStore.setState({
      likedVideoIds: new Set(['vid-1']),
      likedTracks: [{ id: 'vid-1', videoId: 'vid-1', title: 'Song', artist: 'Artist', duration: 100, thumbnail: '' }],
      playlists: [{ id: 'pl-1', name: 'A Playlist', source: 'local', createdAt: '2026-01-01' }],
      history: [{ videoId: 'vid-1', playedAt: '2026-01-01', msPlayed: 5000 }],
    });

    useLibraryStore.getState().resetLibrary();

    const state = useLibraryStore.getState();
    assert.equal(state.likedVideoIds.size, 0);
    assert.equal(state.likedTracks.length, 0);
    assert.equal(state.playlists.length, 0);
    assert.equal(state.history.length, 0);
  });

  it('setUserScope isolates YouTube synced cache per userId', () => {
    useYouTubeAuthStore.getState().setUserScope('user-a');
    useYouTubeAuthStore.setState({
      syncedLikedTracks: [{ id: 'yt-1', videoId: 'yt-1', title: 'YT A', artist: 'Artist', duration: 120, thumbnail: '' }],
    });

    useYouTubeAuthStore.getState().setUserScope('user-b');
    assert.equal(useYouTubeAuthStore.getState().syncedLikedTracks.length, 0);
  });
});
