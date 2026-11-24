import React, { useState, useEffect, useMemo } from "react";
import { Dialog as RadixDialog, VisuallyHidden as RadixVisuallyHidden } from "radix-ui";
import { LyricLine } from "./SyncedLyricsView";
import { cn } from "../utils/cn";
import { getHighResArtworkUrl } from "../utils/artwork";
import {
  FullPlayerTab,
  RelatedItem,
  FullPlayerViewProps,
} from "./full-player/types";
import {
  FullPlayerArtworkHero,
  type FullPlayerArtworkHeroProps,
} from "./full-player/FullPlayerArtworkHero";
import {
  FullPlayerTabsHeader,
  type FullPlayerTabsHeaderProps,
} from "./full-player/FullPlayerTabsHeader";
import {
  FullPlayerQueueTab,
  type FullPlayerQueueTabProps,
} from "./full-player/FullPlayerQueueTab";
import {
  FullPlayerLyricsTab,
  type FullPlayerLyricsTabProps,
} from "./full-player/FullPlayerLyricsTab";
import {
  FullPlayerRelatedTab,
  type FullPlayerRelatedTabProps,
} from "./full-player/FullPlayerRelatedTab";

export type {
  FullPlayerTab,
  RelatedItem,
  FullPlayerViewProps,
  FullPlayerArtworkHeroProps,
  FullPlayerTabsHeaderProps,
  FullPlayerQueueTabProps,
  FullPlayerLyricsTabProps,
  FullPlayerRelatedTabProps,
};
export {
  FullPlayerArtworkHero,
  FullPlayerTabsHeader,
  FullPlayerQueueTab,
  FullPlayerLyricsTab,
  FullPlayerRelatedTab,
};

export const FullPlayerView: React.FC<FullPlayerViewProps> = ({
  track,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  onPlayPause: _onPlayPause,
  onSeek,
  onClose,
  activeTab: controlledActiveTab,
  onTabChange,

  queue = [],
  currentIndex,
  isShuffle = false,
  onSelectTrack,
  onRemoveFromQueue,
  infiniteRadio = true,
  onToggleInfiniteRadio,
  radioTitle,
  onSaveQueue,

  onLikeToggle,
  mediaMode = "audio",
  onToggleMediaMode,

  lyrics,
  synced,
  plainLyrics,
  source,
  lyricsSource,
  isLyricsLoading,
  lyricsLoading,
  related = [],
  onSelectRelated,

  activeQueueFilter = "All",
  onQueueFilterChange,

  asModal = false,
  className,
}) => {
  const [internalTab, setInternalTab] = useState<FullPlayerTab>("upNext");
  const [internalFilter, setInternalFilter] = useState<string>("All");
  const [liked, setLiked] = useState(track?.isLiked || false);
  const [savedQueue, setSavedQueue] = useState(false);

  const activeTab = controlledActiveTab ?? internalTab;
  const currentFilter = onQueueFilterChange ? activeQueueFilter : internalFilter;

  const handleTabClick = (tab: FullPlayerTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const handleFilterClick = (filter: string) => {
    if (onQueueFilterChange) {
      onQueueFilterChange(filter);
    } else {
      setInternalFilter(filter);
    }
  };

  useEffect(() => {
    setLiked(track?.isLiked || false);
  }, [track?.id, track?.isLiked]);

  const handleLikeClick = () => {
    if (!track) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    onLikeToggle?.(track, nextLiked);
  };

  const handleSaveClick = () => {
    setSavedQueue(true);
    onSaveQueue?.();
    setTimeout(() => setSavedQueue(false), 2500);
  };

  const thumbnail = track?.thumbnailUrl || track?.thumbnail;
  const highResBackdrop = getHighResArtworkUrl(thumbnail, 1024);

  const isLyricsObj = typeof lyrics === "object" && lyrics !== null && !Array.isArray(lyrics);
  const resolvedSynced =
    synced !== undefined
      ? synced
      : isLyricsObj && "synced" in lyrics && typeof lyrics.synced === "boolean"
      ? lyrics.synced
      : undefined;

  const resolvedPlainLyrics =
    plainLyrics !== undefined
      ? plainLyrics
      : isLyricsObj && "plainLyrics" in lyrics && typeof lyrics.plainLyrics === "string"
      ? lyrics.plainLyrics
      : typeof lyrics === "string" && resolvedSynced === false
      ? lyrics
      : undefined;

  const resolvedSource =
    source || lyricsSource || (isLyricsObj && "source" in lyrics ? (lyrics as { source?: string }).source : undefined);
  const resolvedLoading = Boolean(isLyricsLoading || lyricsLoading);

  const parsedLyrics: LyricLine[] = useMemo(() => {
    if (!lyrics) return [];
    if (Array.isArray(lyrics)) return lyrics;
    if (isLyricsObj && "lines" in lyrics && Array.isArray((lyrics as any).lines)) {
      return (lyrics as any).lines.map((line: any, idx: number) => ({
        id: line.id || `line-${idx}`,
        time: line.time ?? ((line.timeMs ?? 0) / 1000),
        text: line.text,
      }));
    }
    if (typeof lyrics === "string") {
      return lyrics
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((text, idx) => ({
          id: `line-${idx}`,
          time: idx * 5,
          text: text.trim(),
        }));
    }
    return [];
  }, [lyrics, isLyricsObj]);

  const filterChips = ["All", "Familiar", "Discover", "Popular", "Deep cuts"];

  const content = (
    <div
      className={cn(
        "relative flex flex-col h-full w-full overflow-hidden select-none bg-canvas text-text-primary",
        className
      )}
    >
      {/* Dynamic Ambient Aura Backdrop Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        {(highResBackdrop || thumbnail) && (
          <img
            src={highResBackdrop || thumbnail}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover blur-[160px] scale-150 opacity-15 filter saturate-200"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-canvas/40 via-canvas/80 to-canvas" />
      </div>

      {/* Main 2-Column Split: Left Canvas Artwork | Right Tabs & Queue */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 px-6 sm:px-10 lg:px-14 pt-3 pb-28 sm:pb-36 overflow-hidden max-w-[1700px] mx-auto w-full">
        {/* LEFT COLUMN: Large Square Album Artwork with Ambient Glow + Audio/Video Switcher */}
        <FullPlayerArtworkHero
          track={track}
          thumbnail={thumbnail}
          mediaMode={mediaMode}
          onToggleMediaMode={onToggleMediaMode}
          onClose={onClose}
          liked={liked}
          onLikeClick={handleLikeClick}
        />

        {/* RIGHT COLUMN: 3-Tab Panel (UP NEXT | LYRICS | RELATED) */}
        <div className="lg:col-span-6 flex flex-col min-h-0 h-full overflow-hidden bg-surface/30 backdrop-blur-xl border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-2xl">
          <FullPlayerTabsHeader
            activeTab={activeTab}
            onTabClick={handleTabClick}
          />

          {/* TAB 1: UP NEXT */}
          <div className={cn("h-full flex-col min-h-0", activeTab === "upNext" ? "flex" : "hidden")}>
            <FullPlayerQueueTab
              track={track}
              thumbnail={thumbnail}
              isPlaying={isPlaying}
              duration={duration}
              radioTitle={radioTitle}
              savedQueue={savedQueue}
              onSaveClick={handleSaveClick}
              infiniteRadio={infiniteRadio}
              onToggleInfiniteRadio={onToggleInfiniteRadio}
              filterChips={filterChips}
              currentFilter={currentFilter}
              onFilterClick={handleFilterClick}
              queue={queue}
              currentIndex={currentIndex}
              isShuffle={isShuffle}
              onSelectTrack={onSelectTrack}
              onRemoveFromQueue={onRemoveFromQueue}
            />
          </div>

          {/* TAB 2: LYRICS */}
          <div className={cn("h-full flex-col min-h-0", activeTab === "lyrics" ? "flex" : "hidden")}>
            <FullPlayerLyricsTab
              resolvedLoading={resolvedLoading}
              resolvedSynced={resolvedSynced}
              resolvedPlainLyrics={resolvedPlainLyrics}
              resolvedSource={resolvedSource}
              parsedLyrics={parsedLyrics}
              currentTime={currentTime}
              onSeek={onSeek}
            />
          </div>

          {/* TAB 3: RELATED */}
          <div className={cn("h-full flex-col min-h-0", activeTab === "related" ? "flex" : "hidden")}>
            <FullPlayerRelatedTab
              related={related}
              onSelectRelated={onSelectRelated}
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (asModal) {
    return (
      <RadixDialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <RadixDialog.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-50 flex flex-col bg-canvas text-text-primary overflow-hidden select-none focus:outline-none"
          >
            <RadixVisuallyHidden.Root>
              <RadixDialog.Title>
                {track ? `Playing ${track.title}` : "Full Player View"}
              </RadixDialog.Title>
            </RadixVisuallyHidden.Root>
            {content}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    );
  }

  return content;
};
