'use client';

import React, { useEffect, useState } from 'react';
import { Disc3, Plus, Youtube } from 'lucide-react';
import {
  Container,
  Flex,
  PageHeader,
  Button,
  Badge,
} from '@mp/dying';
import { useLibraryStore } from '@/stores/libraryStore';
import { useAuthStore } from '@/stores/authStore';
import { useYouTubeAuthStore } from '@/stores/youtubeAuthStore';
import { useSpotifyImportStore } from '@/stores/spotifyImportStore';
import { ConnectYouTubeModal } from '@/components/ConnectYouTubeModal';
import { CreatePlaylistDialog } from '@/components/CreatePlaylistDialog';
import { LibraryLikedCards } from './components/LibraryLikedCards';
import { LibraryPlaylistsSection } from './components/LibraryPlaylistsSection';
import { LibraryRecentlyPlayed } from './components/LibraryRecentlyPlayed';

export default function LibraryPage() {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const setSpotifyModalOpen = useSpotifyImportStore((s) => s.setModalOpen);
  const spotifyJob = useSpotifyImportStore((s) => s.job);
  const isSpotifyRunning =
    spotifyJob?.status === 'queued' || spotifyJob?.status === 'running';

  const { likedTracks, playlists, history, fetchLibrary } = useLibraryStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const {
    isYouTubeAuthenticated,
    youtubeAccount,
    syncedLikedTracks,
    syncedPlaylists,
    checkStatus,
  } = useYouTubeAuthStore();

  useEffect(() => {
    fetchLibrary();
    checkStatus();
    if (typeof window !== 'undefined' && window.location.search.includes('spotify=')) {
      setSpotifyModalOpen(true);
    }
  }, [fetchLibrary, checkStatus]);

  const handleCreatePlaylist = () => {
    setCreatePlaylistOpen(true);
  };

  return (
    <Container size="xl" className="py-6 px-4 sm:px-6 pb-24">
      <PageHeader
        title="Library"
        kicker="Your Music"
        actionSlot={
          <Flex align="center" gap="2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Youtube size={15} className="text-red-500" />}
              onClick={() => setConnectModalOpen(true)}
            >
              {isYouTubeAuthenticated
                ? youtubeAccount?.name || 'YouTube Connected'
                : 'Connect YouTube Music'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Disc3 size={15} className="text-status-success" />}
              onClick={() => setSpotifyModalOpen(true)}
            >
              <Flex align="center" gap="2">
                <span>Import Spotify</span>
                {isSpotifyRunning && (
                  <Badge variant="info" size="xs">
                    {spotifyJob?.progress ?? 0}%
                  </Badge>
                )}
              </Flex>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus size={15} />}
              onClick={handleCreatePlaylist}
            >
              New Playlist
            </Button>
          </Flex>
        }
      />

      <LibraryLikedCards
        likedTracks={likedTracks}
        syncedLikedTracks={syncedLikedTracks}
        isYouTubeAuthenticated={isYouTubeAuthenticated}
        onOpenConnectModal={() => setConnectModalOpen(true)}
      />

      <LibraryPlaylistsSection
        playlists={playlists}
        syncedPlaylists={syncedPlaylists}
        isYouTubeAuthenticated={isYouTubeAuthenticated}
        onCreatePlaylist={handleCreatePlaylist}
      />

      {isAuthenticated && <LibraryRecentlyPlayed history={history} />}

      <ConnectYouTubeModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
      />

      <CreatePlaylistDialog
        open={createPlaylistOpen}
        onOpenChange={setCreatePlaylistOpen}
      />
    </Container>
  );
}
