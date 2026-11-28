'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreatePlaylistDialog } from '../CreatePlaylistDialog';
import { AddToPlaylistModal } from '../AddToPlaylistModal';
import { AccountModal } from '../AccountModal';
import { PlaybackOptionsModal } from '../PlaybackOptionsModal';
import { SpotifyImportModal } from '../SpotifyImportModal';
import { type Track } from '../../stores/playerStore';
import { useLibraryStore, type Playlist } from '../../stores/libraryStore';
import { useTrackActionsStore } from '../../stores/trackActionsStore';
import { useSpotifyImportStore } from '../../stores/spotifyImportStore';
import { useAuthStore } from '../../stores/authStore';

export interface ShellModalsProps {
  isCreatePlaylistOpen: boolean;
  setIsCreatePlaylistOpen: (open: boolean) => void;
  isAccountModalOpen: boolean;
  setIsAccountModalOpen: (open: boolean) => void;
  isPlaybackOptionsOpen: boolean;
  setIsPlaybackOptionsOpen: (open: boolean) => void;
}

export function ShellModals({
  isCreatePlaylistOpen,
  setIsCreatePlaylistOpen,
  isAccountModalOpen,
  setIsAccountModalOpen,
  isPlaybackOptionsOpen,
  setIsPlaybackOptionsOpen,
}: ShellModalsProps) {
  const router = useRouter();
  const addToPlaylistTrack = useTrackActionsStore((s) => s.addToPlaylistTrack);
  const closeAddToPlaylist = useTrackActionsStore((s) => s.closeAddToPlaylist);
  const addTracksToPlaylist = useLibraryStore((s) => s.addTracksToPlaylist);
  const spotifyModalOpen = useSpotifyImportStore((s) => s.isModalOpen);
  const setSpotifyModalOpen = useSpotifyImportStore((s) => s.setModalOpen);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Track picked in "Add to playlist" before choosing "Create new playlist"; it goes into the new playlist.
  const [trackForNewPlaylist, setTrackForNewPlaylist] = useState<Track | null>(null);

  const handlePlaylistCreated = async (playlist: Playlist) => {
    const pending = trackForNewPlaylist;
    if (pending) {
      await addTracksToPlaylist(playlist.id, [pending]);
    }
    setIsCreatePlaylistOpen(false);
    router.push(`/playlist/${playlist.id}`);
  };

  return (
    <>
      <CreatePlaylistDialog
        open={isCreatePlaylistOpen}
        onOpenChange={(open) => {
          setIsCreatePlaylistOpen(open);
          if (!open) setTrackForNewPlaylist(null);
        }}
        onPlaylistCreated={handlePlaylistCreated}
      />

      <AddToPlaylistModal
        open={addToPlaylistTrack !== null}
        onOpenChange={(open) => {
          if (!open) closeAddToPlaylist();
        }}
        track={addToPlaylistTrack}
        onCreateNewPlaylist={() => {
          setTrackForNewPlaylist(addToPlaylistTrack);
          setIsCreatePlaylistOpen(true);
        }}
      />

      <AccountModal
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
      />

      <PlaybackOptionsModal
        open={isPlaybackOptionsOpen}
        onOpenChange={setIsPlaybackOptionsOpen}
      />

      <SpotifyImportModal
        open={spotifyModalOpen}
        onOpenChange={setSpotifyModalOpen}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}
