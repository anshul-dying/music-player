'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AmbientAura,
  Flex,
  Box,
  Grid,
  Stack,
  Skeleton,
  MoodChipBar,
  type MoodChipData,
  type TrackData,
} from '@mp/dying';
import { usePlayerStore, type Track } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useYouTubeAuthStore } from '../stores/youtubeAuthStore';
import { toRecentlyPlayed } from '../stores/library/recentlyPlayed';
import { getGuestLikes } from '../stores/library/guestStorage';
import { type MediaShelfData, generateSyntheticShelves } from '@mp/player-core';
import { HomeQuickPicks } from '../components/home/HomeQuickPicks';
import { HomeShelves } from '../components/home/HomeShelves';

export default function HomePage() {
  const {
    currentTrack,
    playbackState,
    playTrack,
    pause,
    setQueue,
    addToQueue,
    getHomeFeed,
    getNextRadio,
    networkAdapterType,
  } = usePlayerStore();

  const isYouTubeAuthenticated = useYouTubeAuthStore((s) => s.isYouTubeAuthenticated);
  const { isLiked, history, likedTracks } = useLibraryStore();

  const userTracks = useMemo(() => {
    const fromHistory = toRecentlyPlayed(history);
    if (fromHistory.length > 0) return fromHistory;
    if (likedTracks && likedTracks.length > 0) return likedTracks;
    return typeof window !== 'undefined' ? getGuestLikes() : [];
  }, [history, likedTracks]);

  const [moodChips, setMoodChips] = useState<MoodChipData[]>([]);
  const [activeMoodChipId, setActiveMoodChipId] = useState<string | null>(null);
  const [quickPicks, setQuickPicks] = useState<Track[]>([]);
  const [shelves, setShelves] = useState<MediaShelfData[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Load real YouTube Music live feed
  useEffect(() => {
    let isMounted = true;
    setIsLoadingFeed(true);

    getHomeFeed(undefined, { history: userTracks, likedTracks, enableSynthetic: true })
      .then((feed) => {
        if (!isMounted) return;
        if (feed.chips && feed.chips.length > 0) {
          setMoodChips(feed.chips);
        }
        setQuickPicks(feed.quickPicks || []);
        setShelves(feed.shelves || []);
      })
      .catch((err) => {
        console.error('Failed to load YouTube Music home feed:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingFeed(false);
      });

    return () => {
      isMounted = false;
    };
  }, [getHomeFeed, isYouTubeAuthenticated, networkAdapterType]);

  // Reactively enrich shelves if new tracks are played or liked
  useEffect(() => {
    if (shelves.length > 0 && userTracks.length > 0) {
      setShelves((prev) =>
        generateSyntheticShelves(prev, {
          history: userTracks,
          likedTracks,
          fallbackSeedTracks: quickPicks,
          enableSynthetic: true,
        })
      );
    }
  }, [userTracks, likedTracks]);

  const handleSelectMoodChip = async (chipId: string) => {
    const nextActive = activeMoodChipId === chipId ? null : chipId;
    setActiveMoodChipId(nextActive);
    setIsLoadingFeed(true);

    try {
      const feed = await getHomeFeed(nextActive || undefined, {
        history: userTracks,
        likedTracks,
        enableSynthetic: true,
      });
      setQuickPicks(feed.quickPicks || []);
      setShelves(feed.shelves || []);
    } catch (err) {
      console.error('Failed to load mood feed:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const handlePlayTrackWithRadio = async (track: Track) => {
    try {
      await playTrack(track);
      if (track.videoId) {
        const nextRadio = await getNextRadio(track.videoId);
        if (nextRadio && nextRadio.queue && nextRadio.queue.length > 0) {
          const radioQueue = [track, ...nextRadio.queue.filter((t) => t.videoId !== track.videoId)];
          setQueue(radioQueue, 0, false);
        }
      }
    } catch (err) {
      console.error('Playback error:', err);
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
    <Box className="relative">
      <AmbientAura intensity={0.2} animated={isCurrentlyPlaying} />

      <Box className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto space-y-10">
        {/* Mood Chips Strip */}
        {moodChips.length > 0 && (
          <Box className="select-none">
            <MoodChipBar
              chips={moodChips}
              activeId={activeMoodChipId}
              onSelectChip={(chip) => handleSelectMoodChip(chip.id)}
              showScrollButtons
            />
          </Box>
        )}

        {/* Loading Skeletons */}
        {isLoadingFeed && quickPicks.length === 0 && shelves.length === 0 && (
          <Stack gap="8">
            <Stack gap="3">
              <Skeleton className="h-6 w-48" />
              <Grid cols={4} gap="4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </Grid>
            </Stack>
            <Stack gap="3">
              <Skeleton className="h-6 w-36" />
              <Flex gap="4" className="overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-44 rounded-2xl shrink-0" />
                ))}
              </Flex>
            </Stack>
          </Stack>
        )}

        {/* Quick Picks */}
        <HomeQuickPicks
          quickPicks={quickPicks}
          currentTrack={currentTrack}
          isCurrentlyPlaying={isCurrentlyPlaying}
          getTrackDataWithLiked={getTrackDataWithLiked}
          onPlayTrack={handlePlayTrackWithRadio}
          onPause={pause}
          onAddToQueue={addToQueue}
        />

        {/* Dynamic Shelves */}
        <HomeShelves
          shelves={shelves}
          onPlayTrack={handlePlayTrackWithRadio}
        />
      </Box>
    </Box>
  );
}
