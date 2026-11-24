'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Music2 } from 'lucide-react';
import {
  Container,
  Box,
  Flex,
  Stack,
  Heading,
  Button,
  TrackRow,
  MediaShelf,
  MediaCard,
  Skeleton,
  EmptyState,
} from '@mp/dying';
import { usePlayerStore, toTrackData } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useTrackMenu } from '@/components/track-menu/useTrackMenu';
import { type ArtistDetails, type Track } from '@mp/player-core';
import { ArtistHeader } from '../components/ArtistHeader';

export default function ArtistPage() {
  const params = useParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const rawId = params?.id as string | undefined;
  const artistId = rawId ? decodeURIComponent(rawId) : '';

  const [artist, setArtist] = useState<ArtistDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    getArtist,
    currentTrack,
    playbackState,
    playTrack,
    setQueue,
    play,
    pause,
    togglePlay,
  } = usePlayerStore();

  const isLiked = useLibraryStore((s) => s.isLiked);
  const renderTrackMenu = useTrackMenu();

  const isArtistActive = Boolean(
    artist && currentTrack && artist.topSongs.some((t) => (t.videoId || t.id) === (currentTrack.videoId || currentTrack.id))
  );
  const isPlaying = playbackState === 'playing';
  const isThisArtistPlaying = isArtistActive && isPlaying;

  useEffect(() => {
    if (!artistId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getArtist(artistId)
      .then((data) => {
        if (isMounted) {
          setArtist(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load artist details');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [artistId, getArtist]);

  const handlePlayAll = (shuffle = false) => {
    if (!artist || artist.topSongs.length === 0) return;

    if (isThisArtistPlaying && !shuffle) {
      pause();
      return;
    }

    if (isArtistActive && playbackState === 'paused' && !shuffle) {
      play();
      return;
    }

    const songs = [...artist.topSongs];
    if (shuffle) {
      for (let i = songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [songs[i], songs[j]] = [songs[j], songs[i]];
      }
    }

    setQueue(songs, 0, false);
    playTrack(songs[0]);
  };

  const handleRadio = () => {
    if (!artist || artist.topSongs.length === 0) return;
    const songs = [...artist.topSongs];
    setQueue(songs, 0, false);
    playTrack(songs[0]);
  };

  const handleTrackSelect = (track: Track, index: number) => {
    if (!artist) return;
    const isCurrent = currentTrack && (currentTrack.videoId === track.videoId || currentTrack.id === track.id);
    if (isCurrent) {
      togglePlay();
      return;
    }
    setQueue(artist.topSongs, index, false);
    playTrack(track);
  };

  if (isLoading) {
    return (
      <Container size="xl" className="py-8 px-4 sm:px-6">
        <Box className="relative h-72 sm:h-80 md:h-96 rounded-3xl overflow-hidden border border-border-subtle bg-surface mb-8">
          <Skeleton className="w-full h-full" />
        </Box>
        <Stack gap="4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </Stack>
      </Container>
    );
  }

  if (error || !artist) {
    return (
      <Container size="xl" className="py-16 px-4">
        <EmptyState
          icon={<Music2 size={36} className="text-text-tertiary" />}
          title="Artist Not Found"
          description={error || "We couldn't load the details for this artist."}
          actionSlot={
            <Button variant="secondary" onClick={() => router.push('/')}>
              Return Home
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container size="xl" className="py-6 px-4 sm:px-6 pb-24">
      {/* Artist Hero Header */}
      <ArtistHeader
        artist={artist}
        isThisArtistPlaying={isThisArtistPlaying}
        onPlayAll={handlePlayAll}
        onRadio={handleRadio}
      />

      {/* Top Songs */}
      {artist.topSongs.length > 0 && (
        <Box className="mb-12">
          <Flex align="center" justify="between" className="mb-4">
            <Heading level={3} className="text-xl sm:text-2xl font-bold text-text-primary">
              Top Songs
            </Heading>
          </Flex>

          <Stack gap="1">
            {artist.topSongs.map((track, idx) => {
              const isTrackActive =
                currentTrack?.videoId === track.videoId || currentTrack?.id === track.id;

              return (
                <TrackRow
                  key={track.videoId || track.id || idx}
                  index={idx}
                  track={toTrackData(track, isLiked(track.videoId || track.id))}
                  isActive={isTrackActive}
                  isPlaying={isTrackActive && isPlaying}
                  actions={renderTrackMenu(track)}
                  onSelect={() => handleTrackSelect(track, idx)}
                  onPlay={() => {
                    if (isTrackActive) {
                      togglePlay();
                    } else {
                      handleTrackSelect(track, idx);
                    }
                  }}
                  onPause={() => togglePlay()}
                  onAlbumClick={(_album, albumId) => {
                    if (albumId) {
                      startTransition(() => router.push(`/album/${albumId}`));
                    }
                  }}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Discography / Albums */}
      {artist.albums.length > 0 && (
        <Box className="mb-12">
          <MediaShelf title="Albums">
            {artist.albums.map((item) => (
              <MediaCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                imageUrl={item.thumbnail}
                onClick={() => {
                  const targetId = item.browseId || item.id;
                  startTransition(() => router.push(`/album/${targetId}`));
                }}
              />
            ))}
          </MediaShelf>
        </Box>
      )}

      {/* Singles & EPs */}
      {artist.singles.length > 0 && (
        <Box className="mb-12">
          <MediaShelf title="Singles & EPs">
            {artist.singles.map((item) => (
              <MediaCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                imageUrl={item.thumbnail}
                onClick={() => {
                  const targetId = item.browseId || item.id;
                  startTransition(() => router.push(`/album/${targetId}`));
                }}
              />
            ))}
          </MediaShelf>
        </Box>
      )}

      {/* Related Artists */}
      {artist.relatedArtists.length > 0 && (
        <Box className="mb-12">
          <MediaShelf title="Fans Might Also Like">
            {artist.relatedArtists.map((item) => (
              <MediaCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                imageUrl={item.thumbnail}
                onClick={() => {
                  const targetId = item.browseId || item.id;
                  startTransition(() => router.push(`/artist/${targetId}`));
                }}
              />
            ))}
          </MediaShelf>
        </Box>
      )}
    </Container>
  );
}
