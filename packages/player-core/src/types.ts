/**
 * Core type definitions for @mp/player-core
 */

export type InnerTubeClientName =
  | 'TVHTML5'
  | 'ANDROID'
  | 'VISIONOS'
  | 'IOS'
  | 'ANDROID_MUSIC'
  | 'WEB_REMIX'
  | 'WEB'
  | 'MWEB';

export interface InnerTubeContext {
  client: {
    clientName: string;
    clientVersion: string;
    hl?: string;
    gl?: string;
    osName?: string;
    osVersion?: string;
    platform?: string;
    deviceMake?: string;
    deviceModel?: string;
    originalUrl?: string;
    visitorData?: string;
  };
}

export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration: number; // in seconds
  thumbnail: string;
  thumbnails?: Thumbnail[];
}

export interface AudioFormat {
  itag: number;
  mimeType: string;
  bitrate: number;
  averageBitrate?: number;
  contentLength?: string;
  approxDurationMs?: string;
  url?: string;
  cipher?: string;
  signatureCipher?: string;
  initRange?: {
    start: string;
    end: string;
  };
  indexRange?: {
    start: string;
    end: string;
  };
  audioSampleRate?: string;
  audioChannels?: number;
  loudnessDb?: number;
  is_sabr?: boolean;
  isSabr?: boolean;
  xtags?: string;
  lastModified?: string;
  last_modified_ms?: string;
  audioQuality?: string;
  audio_quality?: string;
  quality?: string;
  qualityLabel?: string;
  quality_label?: string;
  targetDurationSec?: number;
  target_duration_sec?: number;
}

export interface PlayabilityStatus {
  status: 'OK' | 'UNPLAYABLE' | 'LOGIN_REQUIRED' | 'ERROR' | string;
  reason?: string;
  playableInEmbed?: boolean;
}

export interface StreamingData {
  expiresInSeconds?: string;
  formats?: AudioFormat[];
  adaptiveFormats?: AudioFormat[];
  dashManifestUrl?: string;
  hlsManifestUrl?: string;
  serverAbrStreamingUrl?: string;
  videoPlaybackUstreamerConfig?: string;
}

export interface PlayerResponse {
  playabilityStatus: PlayabilityStatus;
  videoDetails?: {
    videoId: string;
    title: string;
    lengthSeconds: string;
    channelId?: string;
    author?: string;
    thumbnail?: {
      thumbnails: Thumbnail[];
    };
  };
  streamingData?: StreamingData;
}

export interface ClientVerdict {
  client: InnerTubeClientName;
  playable: boolean;
  benchedUntil?: number;
  reason?: string;
}

export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export type PlaybackRate = number;

export type RepeatMode = 'off' | 'all' | 'one';

export interface MoodChipData {
  id: string;
  title: string;
  params?: string;
  isActive?: boolean;
}

export interface ShelfItemData {
  id: string;
  type: 'song' | 'album' | 'playlist' | 'artist';
  title: string;
  subtitle: string;
  thumbnail: string;
  videoId?: string;
  browseId?: string;
}

export interface MediaShelfData {
  id: string;
  title: string;
  subtitle?: string;
  items: ShelfItemData[];
}

export interface HomeFeedData {
  chips: MoodChipData[];
  quickPicks: Track[];
  shelves: MediaShelfData[];
}

export interface NextRadioData {
  queue: Track[];
  related: ShelfItemData[];
  relatedBrowseId?: string;
}

export interface ArtistDetails {
  id: string;
  name: string;
  subscribers?: string;
  bannerUrl?: string;
  avatarUrl?: string;
  description?: string;
  topSongs: Track[];
  albums: ShelfItemData[];
  singles: ShelfItemData[];
  relatedArtists: ShelfItemData[];
}

export interface AlbumDetails {
  id: string;
  title: string;
  artist: string;
  artistBrowseId?: string;
  year?: string;
  coverUrl?: string;
  trackCount?: number;
  duration?: string;
  tracks: Track[];
}

export interface RemotePlaylistDetails {
  id: string;
  title: string;
  description?: string;
  author?: string;
  coverUrl?: string;
  trackCount?: number;
  tracks: Track[];
}

export type LikeStatus = 'LIKE' | 'INDIFFERENT';

export interface YouTubeAccountInfo {
  name?: string;
  avatar?: string;
  handle?: string;
}

export interface YouTubeAuthStatus {
  connected: boolean;
  hasCookie: boolean;
  account?: YouTubeAccountInfo;
}


