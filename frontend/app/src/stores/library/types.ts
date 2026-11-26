import { type Track } from '@mp/player-core';

export interface Playlist {
  id: string;
  name: string;
  source: string;
  trackCount?: number;
  coverArt?: string;
  ytPlaylistId?: string;
  createdAt: string;
}

export interface PlayHistoryItem {
  videoId: string;
  playedAt: string;
  msPlayed: number;
  /** Track details, null for plays recorded without them. */
  title?: string | null;
  artist?: string | null;
  albumArt?: string | null;
  durationSec?: number | null;
}

export interface LibraryState {
  likedVideoIds: Set<string>;
  likedTracks: Track[];
  playlists: Playlist[];
  history: PlayHistoryItem[];
  isLoading: boolean;

  // Actions
  fetchLibrary: () => Promise<void>;
  resetLibrary: () => void;
  toggleLike: (track: Track) => Promise<void>;
  isLiked: (videoId: string) => boolean;
  createPlaylist: (name: string) => Promise<Playlist | null>;
  deletePlaylist: (id: string) => Promise<boolean>;
  addTracksToPlaylist: (playlistId: string, tracks: Track[]) => Promise<boolean>;
  removeTrackFromPlaylist: (playlistId: string, videoId: string) => Promise<boolean>;
  recordPlayHistory: (track: Track, msPlayed?: number) => Promise<void>;
  fetchPlaylistTracks: (playlistId: string) => Promise<Track[]>;
}
