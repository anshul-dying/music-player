import {
  PlayerEngine,
  Track,
  PlaybackState,
  RepeatMode,
  InnerTubeClientName,
  ClientVerdict,
  HomeFeedData,
  NextRadioData,
  ArtistDetails,
  AlbumDetails,
  RemotePlaylistDetails,
  SyntheticShelfOptions,
} from '@mp/player-core';
import { type TrackData } from '@mp/dying';
import { type LyricsResponse } from '@mp/api-contract';

export type { Track };
export type NetworkAdapterType = 'dev-proxy' | 'web-extension' | 'native-http';
export type StreamingStatus = 'Direct CDN via Extension' | 'Edge Fallback Proxy';
export type SleepTimerMode = 'off' | '15m' | '30m' | '45m' | '60m' | 'end_of_track';

declare global {
  interface Window {
    __MP_EXTENSION_ACTIVE__?: boolean;
  }
}

export interface DiagnosticInfo {
  activeClient: InnerTubeClientName | null;
  activeItag: number | null;
  codec: string;
  bitrate: number | null;
  sampleRate: number | null;
  bufferedAheadSeconds: number;
  bufferedPercent: number;
  playbackState: PlaybackState;
  networkAdapter: NetworkAdapterType;
  verdicts: ClientVerdict[];
  streamingStatus: StreamingStatus;
}

export interface PlayerStoreState {
  // Engine & Playback
  engine: PlayerEngine | null;
  isInitialized: boolean;
  playbackState: PlaybackState;
  playbackRate: number;
  currentTrack: Track | null;
  currentIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  queue: Track[];

  // Sleep Timer
  sleepTimerMode: SleepTimerMode;
  sleepTimerRemaining: number | null;

  // Diagnostics & InnerTube
  activeClient: InnerTubeClientName | null;
  activeItag: number | null;
  codec: string;
  bitrate: number | null;
  sampleRate: number | null;
  bufferedAheadSeconds: number;
  bufferedPercent: number;
  networkAdapterType: NetworkAdapterType;
  streamingStatus: StreamingStatus;
  verdicts: ClientVerdict[];
  error: string | null;

  // Lyrics
  lyrics: LyricsResponse | null;
  isLyricsLoading: boolean;
  lyricsError: string | null;

  // Actions
  initialize: (mediaElement?: HTMLMediaElement) => void;
  playTrack: (track: Track) => Promise<void>;
  play: (index?: number) => Promise<void>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleRepeat: () => void;
  setShuffle: (shuffle: boolean) => void;
  toggleShuffle: () => void;
  setPlaybackRate: (rate: number) => void;
  setSleepTimer: (mode: SleepTimerMode) => void;
  setQueue: (tracks: Track[], startIndex?: number, autoPlay?: boolean) => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  search: (query: string) => Promise<Track[]>;
  setNetworkAdapterType: (type: NetworkAdapterType) => void;
  getDiagnosticInfo: () => DiagnosticInfo;
  getHomeFeed: (moodParam?: string, options?: SyntheticShelfOptions) => Promise<HomeFeedData>;
  getExploreFeed: () => Promise<HomeFeedData>;
  getNextRadio: (videoId: string, playlistId?: string) => Promise<NextRadioData>;
  getArtist: (browseId: string) => Promise<ArtistDetails>;
  getAlbum: (browseId: string) => Promise<AlbumDetails>;
  getPlaylist: (playlistId: string) => Promise<RemotePlaylistDetails>;
  fetchLyrics: (track: Track) => Promise<LyricsResponse | null>;
}

export type StoreSet = (
  partial: Partial<PlayerStoreState> | ((state: PlayerStoreState) => Partial<PlayerStoreState>)
) => void;

export type StoreGet = () => PlayerStoreState;

export function toTrackData(track: Track, isLiked?: boolean): TrackData {
  return {
    id: track.id || track.videoId,
    title: track.title,
    artist: track.artist,
    artistId: track.artistId,
    album: track.album || 'YouTube Music',
    albumId: track.albumId,
    duration: track.duration,
    thumbnailUrl: track.thumbnail,
    isLiked,
  };
}
