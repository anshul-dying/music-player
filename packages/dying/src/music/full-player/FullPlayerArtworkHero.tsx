import React, { useState, useEffect } from "react";
import { ChevronDown, Music2, Headphones, Video, Heart, Maximize2, Minimize2 } from "lucide-react";
import { TrackData } from "../TrackRow";
import { AmbientAura } from "../../effects/AmbientAura";
import { cn } from "../../utils/cn";
import { getHighResArtworkUrl } from "../../utils/artwork";

export interface FullPlayerArtworkHeroProps {
  track: TrackData | null;
  thumbnail?: string;
  mediaMode?: "audio" | "video";
  onToggleMediaMode?: (mode: "audio" | "video") => void;
  onClose: () => void;
  liked: boolean;
  onLikeClick: () => void;
}

export const FullPlayerArtworkHero: React.FC<FullPlayerArtworkHeroProps> = ({
  track,
  thumbnail,
  mediaMode = "audio",
  onToggleMediaMode,
  onClose,
  liked,
  onLikeClick,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const highResThumbnail = getHighResArtworkUrl(thumbnail, 1024);
  const [imgSrc, setImgSrc] = useState(() => highResThumbnail || thumbnail || "");

  useEffect(() => {
    setImgSrc(highResThumbnail || thumbnail || "");
  }, [highResThumbnail, thumbnail]);

  const handleImageError = () => {
    if (thumbnail && imgSrc !== thumbnail) {
      setImgSrc(thumbnail);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="lg:col-span-6 flex flex-col items-center justify-between h-full min-h-0 max-w-xl mx-auto w-full">
      {/* Top Collapse Button & Title */}
      <div className="w-full flex items-center justify-between mb-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimize player"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface hover:bg-surface-hover text-text-secondary hover:text-white border border-border-subtle transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <ChevronDown size={16} />
          <span>Minimize</span>
        </button>
        <span className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
          Now Playing
        </span>
        <button
          type="button"
          onClick={handleToggleFullscreen}
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface hover:bg-surface-hover text-text-secondary hover:text-white border border-border-subtle transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span className="hidden sm:inline">{isFullscreen ? "Exit Full" : "Full Screen"}</span>
        </button>
      </div>

      {/* Large Square Artwork Container */}
      <div className="relative aspect-square w-64 sm:w-80 md:w-96 lg:w-[420px] xl:w-[460px] shrink-0 flex items-center justify-center">
        {/* Ambient Obsidian Backlight Glow */}
        <div className="absolute inset-0 -m-8 rounded-full pointer-events-none overflow-hidden opacity-20 blur-3xl scale-125">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover filter saturate-200"
            />
          ) : (
            <AmbientAura intensity={0.15} blur={120} className="w-full h-full" />
          )}
        </div>

        {/* Album Artwork Card */}
        <div className="relative z-10 h-full w-full overflow-hidden rounded-2xl lg:rounded-3xl bg-surface border border-border-subtle shadow-[0_28px_72px_rgba(0,0,0,0.9)] group">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={track?.title || "Album Artwork"}
              onError={handleImageError}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-text-tertiary">
              <Music2 size={96} className="stroke-1" />
            </div>
          )}

          {/* YouTube Music Audio / Video Switcher Pill (Top Right Overlay) */}
          <div className="absolute top-4 right-4 z-20 flex items-center bg-black/60 backdrop-blur-md rounded-full p-0.5 border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => onToggleMediaMode?.("audio")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                mediaMode === "audio"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-text-secondary hover:text-white"
              )}
              aria-label="Switch to audio mode"
            >
              <Headphones size={13} />
              <span>Song</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleMediaMode?.("video")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                mediaMode === "video"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-text-secondary hover:text-white"
              )}
              aria-label="Switch to video mode"
            >
              <Video size={13} />
              <span>Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* Under-Artwork Metadata & Like Action */}
      <div className="w-full mt-6 flex items-center justify-between px-2">
        <div className="flex flex-col min-w-0 pr-4">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary tracking-tight truncate leading-tight">
            {track?.title || "No track selected"}
          </h2>
          <p className="text-sm sm:text-base text-text-secondary truncate mt-1">
            {track?.artist || "Unknown artist"}
            {track?.album ? ` • ${track.album}` : ""}
          </p>
        </div>

        {track && (
          <button
            type="button"
            aria-label={liked ? "Unlike" : "Like"}
            onClick={onLikeClick}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              liked
                ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                : "text-text-secondary hover:text-white hover:bg-surface-hover"
            )}
          >
            <Heart size={22} className={liked ? "fill-emerald-400" : ""} />
          </button>
        )}
      </div>
    </div>
  );
};

FullPlayerArtworkHero.displayName = "FullPlayerArtworkHero";
