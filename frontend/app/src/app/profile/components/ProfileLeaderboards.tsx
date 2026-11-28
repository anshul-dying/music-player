'use client';

import React from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  EmptyState,
  Flex,
  Grid,
  Heading,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  TrackTable,
} from '@mp/dying';
import type { ProfileStatsResponse } from '@mp/api-contract';
import { Disc3, Music2, Play, Users } from 'lucide-react';
import { usePlayerStore, type Track } from '../../../stores/playerStore';

export interface ProfileLeaderboardsProps {
  stats: ProfileStatsResponse;
}

function formatDurationMinutes(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return `${mins}m`;
}

export function ProfileLeaderboards({ stats }: ProfileLeaderboardsProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.playbackState === 'playing');
  const setQueue = usePlayerStore((s) => s.setQueue);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const pause = usePlayerStore((s) => s.pause);

  const playerTracks: Track[] = stats.topTracks.map((t) => ({
    id: t.videoId,
    videoId: t.videoId,
    title: t.title,
    artist: t.artist,
    album: t.album ?? undefined,
    thumbnail: t.albumArt ?? '',
    duration: t.durationSec,
  }));

  const handlePlayTopMix = () => {
    if (playerTracks.length === 0) return;
    setQueue(playerTracks, 0, true);
  };

  if (stats.totalStreams === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={<Music2 className="h-8 w-8 text-text-tertiary" />}
          title="No listening history yet"
          description="Play a few tracks on GaneGan to unlock your Top Tracks, Top Artists, and Top Albums leaderboards."
        />
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <Flex
        direction="col"
        justify="between"
        gap="4"
        className="mb-5 sm:flex-row sm:items-center"
      >
        <Stack gap="1">
          <Heading as="h2" size="h3">
            Top Listening Leaderboards
          </Heading>
          <Text size="sm" color="secondary">
            Your most-played tracks, artists, and releases for this period
          </Text>
        </Stack>
        <Button
          variant="accent"
          size="md"
          leftIcon={<Play className="h-4 w-4 fill-current" />}
          onClick={handlePlayTopMix}
          disabled={playerTracks.length === 0}
        >
          Play Top Mix
        </Button>
      </Flex>

      <Tabs defaultValue="tracks" variant="underline">
        <TabsList>
          <TabsTrigger value="tracks">Top Tracks ({stats.topTracks.length})</TabsTrigger>
          <TabsTrigger value="artists">Top Artists ({stats.topArtists.length})</TabsTrigger>
          <TabsTrigger value="albums">Top Albums ({stats.topAlbums.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="pt-4">
          <TrackTable
            tracks={stats.topTracks.map((t) => ({
              id: t.videoId,
              videoId: t.videoId,
              title: t.title,
              artist: t.artist,
              album: t.album ?? `${t.plays} plays`,
              thumbnail: t.albumArt ?? undefined,
              duration: t.durationSec,
            }))}
            currentTrackId={currentTrack?.videoId ?? null}
            isPlaying={isPlaying}
            onTrackPlay={(td) => {
              const found = playerTracks.find((p) => p.videoId === td.id);
              if (found) void playTrack(found);
            }}
            onTrackPause={() => void pause()}
          />
        </TabsContent>

        <TabsContent value="artists" className="pt-4">
          <Grid cols={1} gap="3" className="sm:grid-cols-2 lg:grid-cols-3">
            {stats.topArtists.map((artist, idx) => (
              <Card key={artist.artist} variant="glass" className="p-4">
                <CardContent className="p-0">
                  <Flex align="center" gap="3">
                    <Avatar
                      src={artist.albumArt ?? undefined}
                      fallback={`#${idx + 1}`}
                      size="md"
                    />
                    <Stack gap="1" className="min-w-0 flex-1">
                      <Flex align="center" justify="between" gap="2">
                        <Text weight="semibold" className="truncate">
                          {artist.artist}
                        </Text>
                        <Badge variant="glass" size="xs">
                          {artist.plays} plays
                        </Badge>
                      </Flex>
                      <Flex align="center" gap="2">
                        <Users className="h-3.5 w-3.5 text-text-tertiary" />
                        <Text size="xs" color="secondary">
                          {formatDurationMinutes(artist.totalMs)} · {artist.trackCount} tracks
                        </Text>
                      </Flex>
                    </Stack>
                  </Flex>
                </CardContent>
              </Card>
            ))}
          </Grid>
        </TabsContent>

        <TabsContent value="albums" className="pt-4">
          <Grid cols={1} gap="3" className="sm:grid-cols-2 lg:grid-cols-3">
            {stats.topAlbums.map((alb, idx) => (
              <Card key={`${alb.artist}-${alb.album}`} variant="glass" className="p-4">
                <CardContent className="p-0">
                  <Flex align="center" gap="3">
                    {alb.albumArt ? (
                      <img
                        src={alb.albumArt}
                        alt={alb.album}
                        className="h-11 w-11 shrink-0 rounded-xl object-cover bg-surface-active"
                      />
                    ) : (
                      <Box className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-active text-sm font-bold text-text-secondary">
                        #{idx + 1}
                      </Box>
                    )}
                    <Stack gap="1" className="min-w-0 flex-1">
                      <Flex align="center" justify="between" gap="2">
                        <Text weight="semibold" className="truncate">
                          {alb.album}
                        </Text>
                        <Badge variant="glass" size="xs">
                          {alb.plays} plays
                        </Badge>
                      </Flex>
                      <Flex align="center" gap="2">
                        <Disc3 className="h-3.5 w-3.5 text-text-tertiary" />
                        <Text size="xs" color="secondary" className="truncate">
                          {alb.artist} · {formatDurationMinutes(alb.totalMs)}
                        </Text>
                      </Flex>
                    </Stack>
                  </Flex>
                </CardContent>
              </Card>
            ))}
          </Grid>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
