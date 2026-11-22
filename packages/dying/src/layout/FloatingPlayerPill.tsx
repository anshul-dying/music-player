import React, { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ListPlus,
  Mic2,
  MoreHorizontal,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ScrubSlider } from "../primitives/ScrubSlider";
import { SpringButton } from "../primitives/SpringButton";
import { cn } from "../utils/cn";
import { PillTrackInfo, type PillTrackInfoProps } from "./pill/PillTrackInfo";
import {
  PillPlaybackControls,
  type PillPlaybackControlsProps,
} from "./pill/PillPlaybackControls";
import {
  PillVolumeControls,
  type PillVolumeControlsProps,
} from "./pill/PillVolumeControls";

export {
  PillTrackInfo,
  type PillTrackInfoProps,
  PillPlaybackControls,
  type PillPlaybackControlsProps,
  PillVolumeControls,
  type PillVolumeControlsProps,
};

export interface FloatingPlayerPillProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onVolumeChange"> {
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  isPlaying?: boolean;
  currentTime?: number; // seconds
  duration?: number; // seconds
  buffered?: number; // 0 to 100 percentage
  volume?: number; // 0 to 1
  isMuted?: boolean;
  isShuffle?: boolean;
  repeatMode?: "off" | "all" | "one";
  isLyricsOpen?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isLiked?: boolean;
  onToggleLike?: () => void;

  onPlayPause?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeek?: (seconds: number) => void;
  onVolumeChange?: (vol: number) => void;
  onToggleMute?: () => void;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
  onToggleLyrics?: () => void;
  onExpandNowPlaying?: () => void;
  onArtistClick?: () => void;
  onAddToPlaylist?: () => void;
  onMoreOptions?: () => void;

  trailingSlot?: React.ReactNode;
}

function formatTime(seconds: number = 0): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const FloatingPlayerPill = React.forwardRef<
  HTMLDivElement,
  FloatingPlayerPillProps
>(
  (
    {
      className,
      title = "Not Playing",
      artist = "Apple Music Radio",
      album,
      artworkUrl,
      isPlaying = false,
      currentTime = 0,
      duration = 0,
      buffered = 0,
      volume = 0.85,
      isMuted = false,
      isShuffle = false,
      repeatMode = "off",
      isLyricsOpen = false,
      isExpanded = false,
      onToggleExpand,
      isLiked = false,
      onToggleLike,
      onPlayPause,
      onPrevious,
      onNext,
      onSeek,
      onVolumeChange,
      onToggleMute,
      onToggleShuffle,
      onToggleRepeat,
      onToggleLyrics,
      onExpandNowPlaying,
      onArtistClick,
      onAddToPlaylist,
      onMoreOptions,
      trailingSlot,
      ...props
    },
    ref
  ) => {
    const [scrubTime, setScrubTime] = useState<number | null>(null);

    return (
      <div
        ref={ref}
        className={cn(
          "pointer-events-auto relative w-full transition-all duration-300 select-none",
          isExpanded
            ? "max-w-none rounded-none border-x-0 border-b-0 border-t border-border-subtle px-4 sm:px-8 py-3 bg-canvas/95 backdrop-blur-3xl shadow-2xl"
            : "max-w-2xl sm:max-w-3xl rounded-2xl border border-border-subtle bg-glass-frosted p-2.5 sm:p-3 shadow-2xl shadow-black/80 backdrop-blur-2xl backdrop-saturate-150",
          "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.18] before:to-transparent",
          className
        )}
        {...props}
      >
        {/* Upper row: Track info | Transport Controls | Actions */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Artwork & Metadata */}
          <PillTrackInfo
            title={title}
            artist={artist}
            artworkUrl={artworkUrl}
            isLiked={isLiked}
            onExpandNowPlaying={onExpandNowPlaying}
            onArtistClick={onArtistClick}
            onToggleLike={onToggleLike}
          />

          {/* Center: Transport Controls */}
          <PillPlaybackControls
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            onToggleShuffle={onToggleShuffle}
            onPrevious={onPrevious}
            onPlayPause={onPlayPause}
            onNext={onNext}
            onToggleRepeat={onToggleRepeat}
          />

          {/* Right: Lyrics & Volume Utilities */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 sm:min-w-[120px] sm:max-w-[210px] shrink-0">
            {trailingSlot ?? (
              <>
                {onAddToPlaylist && (
                  <SpringButton
                    variant="ghost"
                    size="xs"
                    onClick={onAddToPlaylist}
                    aria-label="Add to playlist"
                    className="text-text-secondary hover:text-white transition-colors"
                  >
                    <ListPlus className="h-4 w-4" />
                  </SpringButton>
                )}

                {/* More options (Speed, Sleep timer, Stats) */}
                {onMoreOptions && (
                  <SpringButton
                    variant="ghost"
                    size="xs"
                    onClick={onMoreOptions}
                    aria-label="Playback options"
                    className="text-text-secondary hover:text-white transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </SpringButton>
                )}

                {/* Lyrics toggle */}
                <SpringButton
                  variant="ghost"
                  size="xs"
                  onClick={onToggleLyrics}
                  aria-label="Toggle Lyrics"
                  className={cn(
                    "text-text-secondary hover:text-white transition-colors",
                    isLyricsOpen && "bg-white/10 text-white rounded-lg"
                  )}
                >
                  <Mic2 className="h-4 w-4" />
                </SpringButton>

                {/* Volume slider & mute */}
                <PillVolumeControls
                  volume={volume}
                  isMuted={isMuted}
                  onToggleMute={onToggleMute}
                  onVolumeChange={onVolumeChange}
                />

                {/* Fullscreen / Expand toggle button */}
                <SpringButton
                  variant="ghost"
                  size="sm"
                  onClick={onToggleExpand || onExpandNowPlaying}
                  aria-label={isExpanded ? "Exit full screen" : "Full screen"}
                  className="text-text-secondary hover:text-white"
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </SpringButton>
              </>
            )}
          </div>
        </div>

        {/* Lower row: Embedded Scrub Bar with Timings */}
        <div className="mt-1 flex w-full items-center gap-2.5 text-[10px] font-mono text-text-tertiary">
          <span className="w-8 text-right tabular-nums">
            {formatTime(scrubTime ?? currentTime)}
          </span>
          <div className="flex-1">
            <ScrubSlider
              size="sm"
              min={0}
              max={duration || 100}
              value={currentTime}
              buffered={buffered}
              onValueChange={setScrubTime}
              onValueCommit={(val) => {
                setScrubTime(null);
                onSeek?.(val);
              }}
              tooltipFormatter={(val) => formatTime(val)}
            />
          </div>
          <span className="w-8 text-left tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    );
  }
);

FloatingPlayerPill.displayName = "FloatingPlayerPill";
