'use client';

import React, { useState, useEffect, useCallback, Suspense, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Flex,
  Stack,
  Heading,
  Text,
  Badge,
  TrackTable,
  Skeleton,
  type TrackData,
} from '@mp/dying';
import { type CategorizedSearchResults } from '@mp/player-core';
import { usePlayerStore, type Track } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useTrackMenu } from '../../components/track-menu/useTrackMenu';
import { SearchShelfSection } from '../../components/search/SearchShelfSection';

type SearchCategory = 'all' | 'songs' | 'artists' | 'albums' | 'playlists';

const EMPTY_RESULTS: CategorizedSearchResults = {
  songs: [],
  artists: [],
  albums: [],
  playlists: [],
};

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const query = searchParams.get('q') || '';
  const isFullMode = searchParams.get('mode') === 'full';

  const {
    currentTrack,
    playbackState,
    playTrack,
    pause,
    setQueue,
    searchCategorized,
    getNextRadio,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const renderTrackMenu = useTrackMenu();

  const [categorized, setCategorized] = useState<CategorizedSearchResults>(EMPTY_RESULTS);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>(isFullMode ? 'all' : 'songs');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setActiveCategory(isFullMode ? 'all' : 'songs');
  }, [isFullMode, query]);

  useEffect(() => {
    if (!query.trim()) {
      setCategorized(EMPTY_RESULTS);
      return;
    }

    let isCurrent = true;
    setIsSearching(true);

    searchCategorized(query.trim())
      .then((res) => {
        if (isCurrent) {
          setCategorized(res || EMPTY_RESULTS);
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
  }, [query, searchCategorized]);

  const results = categorized.songs;

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

  const navigateTo = (path: string) => startTransition(() => router.push(path));
  const categoryTabs: { id: SearchCategory; label: string; count: number }[] = [
    {
      id: 'all',
      label: 'All',
      count:
        categorized.songs.length +
        categorized.artists.length +
        categorized.albums.length +
        categorized.playlists.length,
    },
    { id: 'songs', label: 'Songs', count: categorized.songs.length },
    { id: 'artists', label: 'Artists', count: categorized.artists.length },
    { id: 'albums', label: 'Albums', count: categorized.albums.length },
    { id: 'playlists', label: 'Playlists', count: categorized.playlists.length },
  ];

  const showArtists = activeCategory === 'all' || activeCategory === 'artists';
  const showAlbums = activeCategory === 'all' || activeCategory === 'albums';
  const showPlaylists = activeCategory === 'all' || activeCategory === 'playlists';
  const showSongs = activeCategory === 'all' || activeCategory === 'songs';

  return (
    <Box className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <Flex justify="between" align="center" className="flex-wrap gap-4">
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

      {query.trim() && (
        <Flex gap="2" align="center" className="flex-wrap">
          {categoryTabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeCategory === tab.id ? 'primary' : 'secondary'}
              size="sm"
              className="rounded-full"
              onClick={() => setActiveCategory(tab.id)}
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </Flex>
      )}

      {isSearching && results.length === 0 && categorized.artists.length === 0 ? (
        <Stack gap="3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </Stack>
      ) : (
        <Stack gap="8">
          {showArtists && (
            <SearchShelfSection title="Artists" items={categorized.artists} onNavigate={navigateTo} />
          )}
          {showAlbums && (
            <SearchShelfSection title="Albums" items={categorized.albums} onNavigate={navigateTo} />
          )}
          {showPlaylists && (
            <SearchShelfSection title="Playlists" items={categorized.playlists} onNavigate={navigateTo} />
          )}
          {showSongs && (
            <Stack gap="3">
              {activeCategory === 'all' && results.length > 0 && (
                <Heading level={2} size="h2">Songs</Heading>
              )}
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
                  if (artistId) navigateTo(`/artist/${artistId}`);
                }}
                onAlbumClick={(_album, albumId) => {
                  if (albumId) navigateTo(`/album/${albumId}`);
                }}
                emptyMessage={
                  query.trim()
                    ? 'No matching tracks found. Try searching by artist, title, or album.'
                    : 'Type in the search bar above or press ⌘K to discover songs, albums, and artists.'
                }
              />
            </Stack>
          )}
        </Stack>
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
