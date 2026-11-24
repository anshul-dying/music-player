import React from "react";
import { Check, ListPlus, Radio, Music2, Play, Trash2 } from "lucide-react";
import { TrackData } from "../TrackRow";
import { SoundWave } from "../../effects/SoundWave";
import { Switch } from "../../components/Controls";
import { EmptyState } from "../../components/Feedback";
import { cn } from "../../utils/cn";

export interface FullPlayerQueueTabProps {
  track: TrackData | null;
  thumbnail?: string;
  isPlaying?: boolean;
  duration?: number;
  radioTitle?: string;
  savedQueue: boolean;
  onSaveClick: () => void;
  infiniteRadio?: boolean;
  onToggleInfiniteRadio?: (enabled: boolean) => void;
  filterChips: string[];
  currentFilter: string;
  onFilterClick: (chip: string) => void;
  queue: TrackData[];
  currentIndex?: number;
  isShuffle?: boolean;
  onSelectTrack?: (track: TrackData) => void;
  onRemoveFromQueue?: (trackId: string) => void;
}

function formatDuration(seconds: number = 0): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const FullPlayerQueueTab: React.FC<FullPlayerQueueTabProps> = ({
  track,
  thumbnail,
  isPlaying = false,
  duration = 0,
  radioTitle,
  savedQueue,
  onSaveClick,
  infiniteRadio = true,
  onToggleInfiniteRadio,
  filterChips,
  currentFilter,
  onFilterClick,
  queue,
  currentIndex,
  isShuffle = false,
  onSelectTrack,
  onRemoveFromQueue,
}) => {
  const resolvedIndex =
    typeof currentIndex === "number" && currentIndex >= 0 && currentIndex < queue.length
      ? currentIndex
      : track
      ? queue.findIndex((q) => q.id === track.id)
      : -1;
  const upcomingTracks = resolvedIndex >= 0 ? queue.slice(resolvedIndex + 1) : queue;
  const previousTracks = resolvedIndex > 0 ? queue.slice(0, resolvedIndex) : [];

  const renderQueueRow = (queueTrack: TrackData, displayIndex: number, keyPrefix: string) => {
    const qThumb = queueTrack.thumbnailUrl || queueTrack.thumbnail;
    return (
      <div
        key={`${keyPrefix}-${queueTrack.id || displayIndex}`}
        role="button"
        tabIndex={0}
        onClick={() => onSelectTrack?.(queueTrack)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectTrack?.(queueTrack);
          }
        }}
        className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-hover/80 transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <div className="flex items-center min-w-0 flex-1 mr-3">
          <span className="font-mono text-xs text-text-tertiary w-6 shrink-0 group-hover:hidden">
            {displayIndex}
          </span>
          <div className="hidden group-hover:flex w-6 shrink-0 items-center justify-start text-white">
            <Play size={14} className="fill-current" />
          </div>

          <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-surface border border-border-subtle mr-3">
            {qThumb ? (
              <img src={qThumb} alt={queueTrack.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-text-tertiary">
                <Music2 size={14} />
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-text-primary group-hover:text-white truncate">
              {queueTrack.title}
            </span>
            <span className="text-xs text-text-secondary truncate">
              {queueTrack.artist}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRemoveFromQueue && (
            <button
              type="button"
              aria-label={`Remove ${queueTrack.title} from queue`}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromQueue(queueTrack.id);
              }}
              className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:text-status-error hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          )}
          <span className="text-xs font-mono text-text-tertiary">
            {formatDuration(queueTrack.duration)}
          </span>
        </div>
      </div>
    );
  };
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Radio Source Subheader & Save Pill */}
      <div className="flex items-center justify-between pb-3 px-2 shrink-0">
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold">
            Playing from
          </span>
          <span className="text-sm font-bold text-text-primary truncate">
            {radioTitle || (track ? `${track.title} mix` : "Radio Queue")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveClick}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              savedQueue
                ? "bg-status-success/20 text-status-success border-status-success/40"
                : "bg-surface hover:bg-surface-hover text-text-secondary hover:text-white border-border-subtle"
            )}
            aria-label="Save queue to playlist"
          >
            {savedQueue ? <Check size={14} /> : <ListPlus size={14} />}
            <span>{savedQueue ? "Saved" : "Save"}</span>
          </button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-border-subtle">
            <Radio size={13} className={infiniteRadio ? "text-white" : "text-text-tertiary"} />
            <Switch
              checked={infiniteRadio}
              onCheckedChange={onToggleInfiniteRadio}
              aria-label="Autoplay similar songs"
            />
          </div>
        </div>
      </div>

      {/* YouTube Music Queue Mood Filter Chips Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-2 shrink-0 border-b border-border-subtle mb-3">
        {filterChips.map((chip) => {
          const isActive = currentFilter === chip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onFilterClick(chip)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer select-none shrink-0",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                isActive
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "bg-surface hover:bg-surface-hover text-text-secondary hover:text-white border border-border-subtle"
              )}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Queue Scroll List */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-0.5 pr-1">
        {/* Current Active Track Row */}
        {track && (
          <div className="group flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-active/90 border border-white/10 mb-2 shadow-sm">
            <div className="flex items-center min-w-0 flex-1 mr-3">
              <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-surface border border-border-subtle mr-3">
                {thumbnail ? (
                  <img src={thumbnail} alt={track.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-text-tertiary">
                    <Music2 size={16} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <SoundWave isPlaying={isPlaying} size="sm" color="#ffffff" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate">
                  {track.title}
                </span>
                <span className="text-xs text-text-secondary truncate">
                  {track.artist}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-white/70">
              {formatDuration(track.duration || duration)}
            </span>
          </div>
        )}

        {/* Upcoming Queue Tracks */}
        {upcomingTracks.length > 0 ? (
          <>
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Up Next ({upcomingTracks.length})
              </span>
              {isShuffle && (
                <span className="text-[11px] text-text-tertiary">Shuffle on</span>
              )}
            </div>
            {upcomingTracks.map((queueTrack, idx) =>
              renderQueueRow(queueTrack, idx + 1, "up")
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <EmptyState
              title="No upcoming tracks"
              description="Turn on Autoplay to keep the music playing with similar songs."
            />
          </div>
        )}

        {/* Previously Played Tracks */}
        {previousTracks.length > 0 && (
          <div className="pt-3 mt-3 border-t border-border-subtle/60 opacity-65">
            <div className="px-3 py-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Previously Played ({previousTracks.length})
              </span>
            </div>
            {previousTracks.map((queueTrack, idx) =>
              renderQueueRow(queueTrack, idx + 1, "prev")
            )}
          </div>
        )}
      </div>
    </div>
  );
};

FullPlayerQueueTab.displayName = "FullPlayerQueueTab";
