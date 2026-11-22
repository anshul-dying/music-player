import React from "react";
import {
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  ListMusic,
  Mic2,
  ChevronUp,
  ChevronDown,
  Heart,
} from "lucide-react";
import { GlassPanel } from "../primitives/GlassPanel";
import { ScrubSlider } from "../primitives/ScrubSlider";
import { SpringButton } from "../primitives/SpringButton";
import { type TrackData } from "./TrackRow";
import { cn } from "../utils/cn";

export interface PlayerBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onVolumeChange"> {
  currentTrack?: TrackData | null;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  buffered?: number;
  volume?: number; // 0 to 1
  isMuted?: boolean;
  isShuffle?: boolean;
  repeatMode?: "off" | "all" | "one";
  showLyrics?: boolean;
  showQueue?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isLiked?: boolean;
  onToggleLike?: () => void;

  onPlayPause?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeek?: (seconds: number) => void;
  onVolumeChange?: (vol: number) => void;
  onMuteToggle?: () => void;
  onShuffleToggle?: () => void;
  onRepeatToggle?: () => void;
  onLyricsToggle?: () => void;
  onQueueToggle?: () => void;
  onExpandNowPlaying?: () => void;
}

const formatTime = (s: number = 0) =>
  `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

export const PlayerBar: React.FC<PlayerBarProps> = ({
  className,
  currentTrack,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  buffered = 0,
  volume = 0.8,
  isMuted = false,
  isShuffle = false,
  repeatMode = "off",
  showLyrics = false,
  showQueue = false,
  isExpanded = false,
  onToggleExpand,
  isLiked = false,
  onToggleLike,

  onPlayPause,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onShuffleToggle,
  onRepeatToggle,
  onLyricsToggle,
  onQueueToggle,
  onExpandNowPlaying,
  ...props
}) => {
  const [scrubTime, setScrubTime] = React.useState<number | null>(null);
  const effectiveVolume = isMuted ? 0 : volume;

  const VolumeIcon = effectiveVolume === 0 ? VolumeX : effectiveVolume < 0.5 ? Volume1 : Volume2;

  return (
    <GlassPanel
      variant="heavy"
      className={cn(
        "h-22 w-full px-4 sm:px-6 flex items-center justify-between border-t border-border-subtle backdrop-blur-3xl z-40 select-none",
        className
      )}
      {...props}
    >
      {/* Left: Track Information */}
      <div className="flex items-center gap-3 w-1/4 min-w-[180px] max-w-[280px]">
        {currentTrack ? (
          <>
            <div
              onClick={onExpandNowPlaying}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-surface cursor-pointer group shadow-lg"
            >
              {currentTrack.thumbnailUrl ? (
                <img src={currentTrack.thumbnailUrl} alt={currentTrack.title} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-text-tertiary">♪</div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 size={16} className="text-white" />
              </div>
            </div>

            <div className="flex flex-col min-w-0 pr-2">
              <span
                onClick={onExpandNowPlaying}
                className="truncate text-sm font-semibold text-text-primary hover:underline cursor-pointer"
              >
                {currentTrack.title}
              </span>
              <span className="truncate text-xs text-text-secondary">
                {currentTrack.artist}
              </span>
            </div>

            {onToggleLike && (
              <SpringButton
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike();
                }}
                aria-label={isLiked ? "Unlike" : "Like"}
                className={cn(
                  "shrink-0 ml-1 transition-colors",
                  isLiked
                    ? "text-emerald-400"
                    : "text-text-tertiary hover:text-text-primary"
                )}
              >
                <Heart size={18} className={isLiked ? "fill-emerald-400" : ""} />
              </SpringButton>
            )}
          </>
        ) : (
          <div className="text-xs text-text-tertiary font-medium">No track playing</div>
        )}
      </div>

      {/* Center: Playback Controls & Progress Scrubber */}
      <div className="flex flex-col items-center justify-center max-w-xl w-2/4 px-2">
        {/* Buttons row */}
        <div className="flex items-center gap-4 mb-1">
          <SpringButton
            variant="ghost"
            size="sm"
            onClick={onShuffleToggle}
            aria-label="Shuffle"
            className={cn("text-text-secondary", isShuffle && "text-white font-bold")}
          >
            <Shuffle size={16} />
          </SpringButton>

          <SpringButton
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            aria-label="Previous track"
            className="text-text-secondary hover:text-white"
          >
            <SkipBack size={18} className="fill-current" />
          </SpringButton>

          <SpringButton
            variant="playPause"
            size="md"
            isPlaying={isPlaying}
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          />

          <SpringButton
            variant="ghost"
            size="sm"
            onClick={onNext}
            aria-label="Next track"
            className="text-text-secondary hover:text-white"
          >
            <SkipForward size={18} className="fill-current" />
          </SpringButton>

          <SpringButton
            variant="ghost"
            size="sm"
            onClick={onRepeatToggle}
            aria-label="Repeat mode"
            className={cn("text-text-secondary", repeatMode !== "off" && "text-white font-bold")}
          >
            <Repeat size={16} />
          </SpringButton>
        </div>

        {/* Scrubber row */}
        <div className="flex items-center gap-3 w-full">
          <span className="w-9 text-right font-mono text-[11px] text-text-tertiary">
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

          <span className="w-9 text-left font-mono text-[11px] text-text-tertiary">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Auxiliary Controls (Queue, Lyrics, Volume) */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
        <SpringButton
          variant="ghost"
          size="sm"
          onClick={onLyricsToggle}
          aria-label="Toggle Lyrics"
          className={cn("text-text-secondary hover:text-white", showLyrics && "text-white font-bold bg-white/10")}
        >
          <Mic2 size={16} />
        </SpringButton>

        <SpringButton
          variant="ghost"
          size="sm"
          onClick={onQueueToggle}
          aria-label="Toggle Queue"
          className={cn("text-text-secondary hover:text-white", showQueue && "text-white font-bold bg-white/10")}
        >
          <ListMusic size={16} />
        </SpringButton>

        <div className="flex items-center gap-2 w-28">
          <button
            type="button"
            onClick={onMuteToggle}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
          >
            <VolumeIcon size={16} />
          </button>
          <div className="flex-1">
            <ScrubSlider
              size="sm"
              min={0}
              max={1}
              step={0.01}
              value={effectiveVolume}
              onValueChange={(val) => onVolumeChange?.(val)}
              tooltipFormatter={(val) => `${Math.round(val * 100)}%`}
            />
          </div>
        </div>

        <SpringButton
          variant="ghost"
          size="sm"
          onClick={onToggleExpand || onExpandNowPlaying}
          aria-label={isExpanded ? "Collapse now playing" : "Expand now playing"}
          className="text-text-secondary hover:text-white"
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </SpringButton>
      </div>
    </GlassPanel>
  );
};

PlayerBar.displayName = "PlayerBar";
