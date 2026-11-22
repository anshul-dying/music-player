'use client';

import React, { useState, useEffect, useCallback, Suspense, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Badge,
  TrackTable,
  Skeleton,
  type TrackData,
} from '@mp/dying';
import { usePlayerStore, type Track } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useTrackMenu } from '../../components/track-menu/useTrackMenu';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const query = searchParams.get('q') || '';

  const {
    currentTrack,
    playbackState,
    playTrack,
    pause,
    setQueue,
    search,
    getNextRadio,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const renderTrackMenu = useTrackMenu();

  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let isCurrent = true;
    setIsSearching(true);

    search(query.trim())
      .then((tracks) => {
        if (isCurrent) {
          setResults(tracks || []);
        }
      })
      .catch((err) => {
        console.error('Search error:', err);
      })
      .finally(() => {
        if (isCurrent) {
          setIsSearching(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [query, search]);

  const handlePlayTrack = async (track: Track) => {
    try {
      await playTrack(track);
      if (track.videoId) {
        const nextRadio = await getNextRadio(track.videoId);
        if (nextRadio?.queue && nextRadio.queue.length > 0) {
          const radioQueue = [track, ...nextRadio.queue.filter((t) => t.videoId !== track.videoId)];
          setQueue(radioQueue, 0, false);
        }
      }
    } catch (err) {
      console.error('Play error:', err);
    }
  };

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

  return (
    <Box className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <Flex justify="between" align="center">
        <Stack gap="1">
          <Text variant="kicker" size="xs">
            YOUTUBE MUSIC SEARCH
          </Text>
          <Heading level={1} size="h1">
            {query.trim() ? `Results for "${query.trim()}"` : 'Search Music'}
          </Heading>
        </Stack>
        {isSearching && <Badge variant="accent">Searching InnerTube...</Badge>}
      </Flex>

      {isSearching && results.length === 0 ? (
        <Stack gap="3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </Stack>
      ) : (
        <TrackTable
          tracks={results.map(getTrackDataWithLiked)}
          showAlbum={results.some((t) => t.album)}
          currentTrackId={currentTrack?.id || currentTrack?.videoId}
          isPlaying={isCurrentlyPlaying}
          onTrackSelect={(t) => {
            const matched = results.find((x) => (x.id || x.videoId) === t.id);
            if (matched) handlePlayTrack(matched);
          }}
          onTrackPlay={(t) => {
            const matched = results.find((x) => (x.id || x.videoId) === t.id);
            if (matched) handlePlayTrack(matched);
          }}
          onTrackPause={pause}
          renderActions={(trackData) => {
            const matched = results.find((x) => (x.id || x.videoId) === trackData.id);
            return matched ? renderTrackMenu(matched) : null;
          }}
          onLikeToggle={(trackData) => {
            const matched = results.find((x) => (x.id || x.videoId) === trackData.id);
            if (matched) toggleLike(matched);
          }}
          onArtistClick={(_artist, artistId) => {
            if (artistId) {
              startTransition(() => router.push(`/artist/${artistId}`));
            }
          }}
          onAlbumClick={(_album, albumId) => {
            if (albumId) {
              startTransition(() => router.push(`/album/${albumId}`));
            }
          }}
          emptyMessage={
            query.trim()
              ? 'No matching tracks found. Try searching by artist, title, or album.'
              : 'Type in the search bar above or press ⌘K to discover songs, albums, and artists.'
          }
        />
      )}
    </Box>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
