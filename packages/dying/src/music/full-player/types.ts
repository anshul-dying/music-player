import React from "react";
import { TrackData } from "../TrackRow";
import { LyricLine } from "../SyncedLyricsView";

export type FullPlayerTab = "upNext" | "lyrics" | "related";

export interface RelatedItem {
  id: string;
  title: string;
  subtitle?: string;
  type?: "song" | "album" | "playlist" | "artist";
  thumbnail?: string;
  thumbnailUrl?: string;
  videoId?: string;
  browseId?: string;
}

export interface FullPlayerViewProps {
  track: TrackData | null;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  onClose: () => void;
  activeTab?: FullPlayerTab;
  onTabChange?: (tab: FullPlayerTab) => void;

  // Queue & Navigation
  queue?: TrackData[];
  currentIndex?: number;
  onSelectTrack?: (track: TrackData) => void;
  onReorderQueue?: (newQueue: TrackData[]) => void;
  onRemoveFromQueue?: (trackId: string) => void;
  infiniteRadio?: boolean;
  onToggleInfiniteRadio?: (enabled: boolean) => void;
  radioTitle?: string;
  onSaveQueue?: () => void;

  // Playback Controls (delegated to bottom bar, but handlers preserved)
  onPrevious?: () => void;
  onNext?: () => void;
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
  repeatMode?: "off" | "all" | "one";
  onToggleRepeat?: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  onLikeToggle?: (track: TrackData, liked: boolean) => void;

  // Audio / Video Switcher
  mediaMode?: "audio" | "video";
  onToggleMediaMode?: (mode: "audio" | "video") => void;

  // Tab-specific Data
  lyrics?:
    | LyricLine[]
    | string
    | {
        lines?: Array<{ time?: number; timeMs?: number | null; text: string }>;
        synced?: boolean;
        plainLyrics?: string;
        source?: string;
      };
  synced?: boolean;
  plainLyrics?: string;
  source?: string;
  lyricsSource?: string;
  isLyricsLoading?: boolean;
  lyricsLoading?: boolean;
  related?: RelatedItem[];
  onSelectRelated?: (item: RelatedItem) => void;

  // Filter Chips for Queue
  activeQueueFilter?: string;
  onQueueFilterChange?: (filter: string) => void;

  // In-page Watch View vs Modal Takeover (defaults to in-page view)
  asModal?: boolean;
  className?: string;
}
