import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "../components/Badge";
import { cn } from "../utils/cn";

export interface LyricLine {
  id?: string;
  time: number; // in seconds
  text: string;
}

export interface SyncedLyricsViewProps extends React.HTMLAttributes<HTMLDivElement> {
  lyrics?: LyricLine[];
  currentTime?: number; // in seconds
  onSeek?: (time: number) => void;
  showTimestamps?: boolean;
  autoScroll?: boolean;
  synced?: boolean;
  plainLyrics?: string;
  source?: string;
}

export const SyncedLyricsView: React.FC<SyncedLyricsViewProps> = ({
  className,
  lyrics = [],
  currentTime = 0,
  onSeek,
  showTimestamps = false,
  autoScroll = true,
  synced,
  plainLyrics,
  source,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const hasInitialScrolledRef = useRef(false);
  const wasHiddenRef = useRef(false);
  const lastLyricsRef = useRef(lyrics);

  if (lastLyricsRef.current !== lyrics) {
    lastLyricsRef.current = lyrics;
    hasInitialScrolledRef.current = false;
  }

  // Determine mode: synced karaoke or unsynced plain text
  const isSynced = synced !== undefined ? synced : lyrics.length > 0;
  const hasLyrics = lyrics.length > 0;
  const hasPlainLyrics = Boolean(plainLyrics && plainLyrics.trim().length > 0);

  // Find index of the currently playing lyric line for synced mode
  const activeIndex = hasLyrics
    ? lyrics.reduce((currActive, line, index) => {
        return line.time <= currentTime ? index : currActive;
      }, -1)
    : -1;

  const clearProgrammaticFlag = useCallback(() => {
    isProgrammaticScrollRef.current = false;
    if (programmaticTimerRef.current) {
      clearTimeout(programmaticTimerRef.current);
      programmaticTimerRef.current = null;
    }
  }, []);

  const clearUserScrollLock = useCallback(() => {
    setUserIsScrolling(false);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  const pauseAutoScrollForUser = useCallback(() => {
    clearProgrammaticFlag();
    setUserIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(clearUserScrollLock, 2800);
  }, [clearProgrammaticFlag, clearUserScrollLock]);

  const handleScroll = useCallback(() => {
    if (!isSynced || isProgrammaticScrollRef.current) return;
    pauseAutoScrollForUser();
  }, [isSynced, pauseAutoScrollForUser]);

  const scrollToActiveLine = useCallback(
    (behavior: ScrollBehavior) => {
      const container = containerRef.current;
      const activeEl = activeLineRef.current;
      if (!container || !activeEl || container.clientHeight === 0) return false;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const targetTop = Math.min(
        maxScrollTop,
        Math.max(0, relativeTop - container.clientHeight / 2 + activeRect.height / 2)
      );

      if (Math.abs(container.scrollTop - targetTop) < 1) return true;

      clearProgrammaticFlag();
      isProgrammaticScrollRef.current = true;
      container.scrollTo({ top: targetTop, behavior });
      // Fallback clear in case scrollend does not fire (e.g. instant scroll or older browser)
      programmaticTimerRef.current = setTimeout(clearProgrammaticFlag, behavior === "smooth" ? 900 : 80);
      return true;
    },
    [clearProgrammaticFlag]
  );

  // Keep latest scroll state in a ref so ResizeObserver doesn't re-subscribe on every line
  const scrollStateRef = useRef({ isSynced, autoScroll, userIsScrolling, activeIndex });
  scrollStateRef.current = { isSynced, autoScroll, userIsScrolling, activeIndex };

  useEffect(() => {
    clearUserScrollLock();
  }, [lyrics, clearUserScrollLock]);

  // Smooth auto-scroll to center the active line in synced mode
  useEffect(() => {
    if (!isSynced || !autoScroll || userIsScrolling || activeIndex === -1) return;
    const isFirst = !hasInitialScrolledRef.current;
    if (scrollToActiveLine(isFirst ? "auto" : "smooth")) {
      hasInitialScrolledRef.current = true;
    }
  }, [activeIndex, autoScroll, userIsScrolling, isSynced, scrollToActiveLine]);

  // Listen for scrollend and container visibility transitions (e.g. switching to Lyrics tab)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scrollend", clearProgrammaticFlag);
    wasHiddenRef.current = container.clientHeight === 0;

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        if (container.clientHeight === 0) {
          wasHiddenRef.current = true;
          return;
        }
        if (wasHiddenRef.current) {
          wasHiddenRef.current = false;
          const s = scrollStateRef.current;
          if (s.isSynced && s.autoScroll && !s.userIsScrolling && s.activeIndex !== -1) {
            if (scrollToActiveLine("auto")) hasInitialScrolledRef.current = true;
          }
        }
      });
      observer.observe(container);
    }

    return () => {
      container.removeEventListener("scrollend", clearProgrammaticFlag);
      observer?.disconnect();
    };
  }, [isSynced, clearProgrammaticFlag, scrollToActiveLine]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
    };
  }, []);

  const handleLineSeek = (time: number) => {
    clearUserScrollLock();
    onSeek?.(time);
  };

  const formatLyricTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const attributionFooter = (
    <div className="pt-12 pb-8 flex justify-center">
      <Badge variant="glass" size="xs">
        Lyrics provided by {source || "LRCLIB"}
      </Badge>
    </div>
  );

  // Empty state when neither synced lines nor plain lyrics exist
  if ((isSynced && !hasLyrics) || (!isSynced && !hasPlainLyrics && !hasLyrics)) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[300px] w-full items-center justify-center text-text-tertiary",
          className
        )}
        {...props}
      >
        <p className="text-sm font-medium tracking-wide">No lyrics available</p>
      </div>
    );
  }

  // Dual mode: Unsynced Mode
  if (!isSynced) {
    const displayPlain = plainLyrics || lyrics.map((l) => l.text).join("\n");

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative flex h-full w-full flex-col overflow-y-auto px-6 py-12 scrollbar-none scroll-smooth select-text",
          "mask-[linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]",
          className
        )}
        {...props}
      >
        <div className="flex flex-col items-center max-w-2xl mx-auto w-full py-8">
          <div className="mb-8">
            <Badge variant="glass">Unsynced Lyrics</Badge>
          </div>
          <div className="w-full text-center">
            <p className="whitespace-pre-line text-lg sm:text-xl font-medium text-text-secondary leading-loose tracking-wide">
              {displayPlain}
            </p>
          </div>
          {attributionFooter}
        </div>
      </div>
    );
  }

  // Dual mode: Synced Karaoke Mode
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onWheel={pauseAutoScrollForUser}
      onTouchMove={pauseAutoScrollForUser}
      className={cn(
        "relative flex h-full w-full flex-col overflow-y-auto px-6 py-32 scrollbar-none select-none",
        "mask-[linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-6 py-12 max-w-2xl mx-auto w-full">
        {lyrics.map((line, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;

          return (
            <motion.div
              key={line.id || `${line.time}-${index}`}
              ref={isActive ? activeLineRef : null}
              onClick={() => handleLineSeek(line.time)}
              animate={{ scale: isActive ? 1.04 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleLineSeek(line.time);
                }
              }}
              className={cn(
                "group relative cursor-pointer py-2 transition-opacity duration-300 origin-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded-lg",
                isActive ? "opacity-100" : isPast ? "opacity-30 hover:opacity-75" : "opacity-35 hover:opacity-80"
              )}
            >
              {showTimestamps && (
                <span className="mr-3 font-mono text-xs text-text-tertiary group-hover:text-text-secondary">
                  {formatLyricTime(line.time)}
                </span>
              )}
              <span
                className={cn(
                  "font-sans text-2xl font-bold tracking-tight md:text-3xl transition-all duration-300 leading-relaxed block",
                  isActive
                    ? "text-text-primary drop-shadow-[0_0_24px_rgba(255,255,255,0.75)] dying-lyrics-glow"
                    : "text-text-secondary group-hover:text-text-primary"
                )}
              >
                {line.text}
              </span>
            </motion.div>
          );
        })}
        {attributionFooter}
      </div>
    </div>
  );
};

SyncedLyricsView.displayName = "SyncedLyricsView";
