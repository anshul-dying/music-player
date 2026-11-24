'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppShell,
  FloatingPlayerPill,
  FullPlayerView,
  type TrackData,
} from '@mp/dying';
import { usePlayerStore, type Track } from '../../stores/playerStore';
import { useAuthStore } from '../../stores/authStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useTrackActionsStore } from '../../stores/trackActionsStore';
import { useMediaSession, useKeyboardShortcuts, useUrlSync, useYouTubeSyncInit, useSearchNavigation } from '../../hooks';
import { ShellHeader } from './ShellHeader';
import { ShellSidebar } from './ShellSidebar';
import { ShellModals } from './ShellModals';
import { handleRelatedSelection } from './fullPlayerHandlers';

export interface PersistentAppShellProps {
  children: React.ReactNode;
}

export function PersistentAppShell({ children }: PersistentAppShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [hasMounted, setHasMounted] = useState(false);
  const [, startTransition] = useTransition();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dialog & Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isPlaybackOptionsOpen, setIsPlaybackOptionsOpen] = useState(false);
  const isAddToPlaylistOpen = useTrackActionsStore((s) => s.addToPlaylistTrack !== null);
  const { openAddToPlaylist, closeAddToPlaylist } = useTrackActionsStore.getState();

  // Full Player Modal State
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [fullPlayerTab, setFullPlayerTab] = useState<'lyrics' | 'upNext' | 'related'>('lyrics');

  // Search State & Navigation
  const {
    searchQuery,
    handleSearchChange,
    handleClearSearch,
    handleSearchSubmit,
  } = useSearchNavigation();

  // Stores
  const { user, isAuthenticated } = useAuthStore();
  const {
    currentTrack,
    currentIndex,
    playbackState,
    currentTime,
    duration,
    bufferedPercent,
    volume,
    isMuted,
    queue,
    isShuffle,
    repeatMode,
    lyrics,
    isLyricsLoading,
    related,
    relatedForVideoId,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    next,
    previous,
    toggleShuffle,
    toggleRepeat,
    initialize,
    removeFromQueue,
    play,
    playTrack,
    fetchRelated,
  } = usePlayerStore();

  const {
    playlists,
    fetchLibrary,
    toggleLike,
    isLiked,
  } = useLibraryStore();

  useUrlSync({
    isFullPlayerOpen,
    setIsFullPlayerOpen,
  });

  useMediaSession();
  useYouTubeSyncInit();

  useEffect(() => {
    if (
      isFullPlayerOpen &&
      fullPlayerTab === 'related' &&
      currentTrack?.videoId &&
      relatedForVideoId !== currentTrack.videoId
    ) {
      fetchRelated(currentTrack.videoId).catch(() => {});
    }
  }, [isFullPlayerOpen, fullPlayerTab, currentTrack?.videoId, relatedForVideoId, fetchRelated]);

  const handleToggleLyrics = useCallback(() => {
    if (isFullPlayerOpen && fullPlayerTab === 'lyrics') {
      setIsFullPlayerOpen(false);
    } else {
      setFullPlayerTab('lyrics');
      setIsFullPlayerOpen(true);
    }
  }, [isFullPlayerOpen, fullPlayerTab]);

  const handleCloseModals = useCallback(() => {
    if (isAccountModalOpen) {
      setIsAccountModalOpen(false);
    } else if (isCreatePlaylistOpen) {
      setIsCreatePlaylistOpen(false);
    } else if (isAddToPlaylistOpen) {
      closeAddToPlaylist();
    } else if (isFullPlayerOpen) {
      setIsFullPlayerOpen(false);
    }
  }, [isAccountModalOpen, isCreatePlaylistOpen, isAddToPlaylistOpen, isFullPlayerOpen, closeAddToPlaylist]);

  useKeyboardShortcuts({
    toggleLyrics: handleToggleLyrics,
    toggleFullPlayer: () => setIsFullPlayerOpen((prev) => !prev),
    closeModals: handleCloseModals,
  });

  useEffect(() => {
    setHasMounted(true);
    initialize(audioRef.current || undefined);
  }, [initialize]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary, isAuthenticated]);

  const getTrackDataWithLiked = useCallback(
    (t: Track): TrackData => ({
      id: t.id || t.videoId,
      title: t.title,
      artist: t.artist,
      artistId: t.artistId,
      album: t.album,
      albumId: t.albumId,
      duration: t.duration,
      thumbnailUrl: t.thumbnail,
      isLiked: isLiked(t.videoId || t.id),
    }),
    [isLiked]
  );

  const isCurrentlyPlaying = playbackState === 'playing';

  const isAuthRoute = pathname === '/login' || pathname === '/register';
  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <AppShell
        sidebar={
          isFullPlayerOpen ? null : (
            <ShellSidebar
              playlists={playlists}
              pathname={pathname}
              onNavigate={(path) => router.push(path)}
              onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
            />
          )
        }
        header={
          isFullPlayerOpen ? null : (
            <ShellHeader
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onClearSearch={handleClearSearch}
              onSubmitSearch={handleSearchSubmit}
              hasMounted={hasMounted}
              isAuthenticated={isAuthenticated}
              user={user}
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
            />
          )
        }
        playerDockVariant={isFullPlayerOpen ? "docked" : "floating"}
        isFullBleed={isFullPlayerOpen}
        playerDock={
          currentTrack ? (
            <FloatingPlayerPill
              title={currentTrack.title}
              artist={currentTrack.artist}
              album={currentTrack.album}
              artworkUrl={currentTrack.thumbnail}
              isPlaying={isCurrentlyPlaying}
              currentTime={currentTime}
              duration={duration}
              buffered={bufferedPercent}
              volume={volume}
              isMuted={isMuted}
              isLyricsOpen={isFullPlayerOpen && fullPlayerTab === 'lyrics'}
              isExpanded={isFullPlayerOpen}
              isShuffle={isShuffle}
              repeatMode={repeatMode}
              isLiked={isLiked(currentTrack.videoId || currentTrack.id)}
              onToggleLike={() => toggleLike(currentTrack)}
              onPlayPause={togglePlay}
              onPrevious={previous}
              onNext={next}
              onSeek={seek}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
              onToggleLyrics={handleToggleLyrics}
              onToggleExpand={() => setIsFullPlayerOpen(!isFullPlayerOpen)}
              onExpandNowPlaying={() => setIsFullPlayerOpen(!isFullPlayerOpen)}
              onArtistClick={() => {
                if (currentTrack?.artistId) {
                  startTransition(() => router.push(`/artist/${currentTrack.artistId}`));
                }
              }}
              onToggleShuffle={toggleShuffle}
              onToggleRepeat={toggleRepeat}
              onAddToPlaylist={() => openAddToPlaylist(currentTrack)}
              onMoreOptions={() => setIsPlaybackOptionsOpen(true)}
            />
          ) : null
        }
        overlay={null}
      >
        {isFullPlayerOpen ? (
          <FullPlayerView
            track={currentTrack ? getTrackDataWithLiked(currentTrack) : null}
            isPlaying={isCurrentlyPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={togglePlay}
            onSeek={seek}
            onClose={() => setIsFullPlayerOpen(false)}
            activeTab={fullPlayerTab}
            onTabChange={setFullPlayerTab}
            queue={queue.map(getTrackDataWithLiked)}
            currentIndex={currentIndex}
            isShuffle={isShuffle}
            lyrics={lyrics || undefined}
            isLyricsLoading={isLyricsLoading}
            related={related.map((item) => ({ ...item, thumbnailUrl: item.thumbnail }))}
            onSelectRelated={(item) =>
              handleRelatedSelection(item, playTrack, (route) => {
                setIsFullPlayerOpen(false);
                startTransition(() => router.push(route));
              })
            }
            onLikeToggle={() => {
              if (currentTrack) {
                toggleLike(currentTrack);
              }
            }}
            onSelectTrack={(t) => {
              const idx = queue.findIndex((x) => (x.id || x.videoId) === t.id);
              if (idx !== -1) {
                play(idx);
              } else {
                const matched = queue.find((x) => (x.id || x.videoId) === t.id);
                if (matched) playTrack(matched);
              }
            }}
            onRemoveFromQueue={(trackId) => {
              const idx = queue.findIndex((x) => (x.id || x.videoId) === trackId);
              if (idx !== -1) {
                removeFromQueue(idx);
              }
            }}
          />
        ) : (
          children
        )}
      </AppShell>

      <ShellModals
        isCreatePlaylistOpen={isCreatePlaylistOpen}
        setIsCreatePlaylistOpen={setIsCreatePlaylistOpen}
        isAccountModalOpen={isAccountModalOpen}
        setIsAccountModalOpen={setIsAccountModalOpen}
        isPlaybackOptionsOpen={isPlaybackOptionsOpen}
        setIsPlaybackOptionsOpen={setIsPlaybackOptionsOpen}
      />
      <audio ref={audioRef} id="mp-global-audio" preload="auto" className="hidden" aria-hidden="true" />
    </>
  );
}
