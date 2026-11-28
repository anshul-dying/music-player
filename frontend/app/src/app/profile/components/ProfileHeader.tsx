'use client';

import React from 'react';
import {
  AmbientAura,
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  GlassCard,
  Grid,
  Heading,
  SegmentedControl,
  Stack,
  Text,
} from '@mp/dying';
import type { ProfileStatsRange, ProfileStatsResponse } from '@mp/api-contract';
import { Disc3, Flame, Headphones, Share2, Users } from 'lucide-react';

export interface ProfileHeaderProps {
  displayName: string;
  email?: string | null;
  avatarSrc?: string;
  range: ProfileStatsRange;
  onRangeChange: (range: ProfileStatsRange) => void;
  stats: ProfileStatsResponse | null;
  onOpenShare: () => void;
}

const RANGE_OPTIONS: { value: ProfileStatsRange; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '1y', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

function formatHours(totalSec: number): string {
  const hours = totalSec / 3600;
  if (hours >= 10) return `${Math.round(hours)}h`;
  return `${hours.toFixed(1)}h`;
}

function formatMemberSince(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function ProfileHeader({
  displayName,
  email,
  avatarSrc,
  range,
  onRangeChange,
  stats,
  onOpenShare,
}: ProfileHeaderProps) {
  const memberSince = formatMemberSince(stats?.memberSince ?? null);
  const hasTopArtist = Boolean(stats?.topArtists?.[0]);

  return (
    <Stack gap="6">
      <Box className="relative overflow-hidden rounded-3xl border border-border-subtle bg-surface p-6 sm:p-8">
        <AmbientAura
          primaryColor={hasTopArtist ? 'var(--brand-primary, #FF6A4D)' : '#FF6A4D'}
          secondaryColor="#D6452B"
          tertiaryColor="#3b1510"
          intensity={0.55}
          blur={72}
          className="pointer-events-none opacity-80"
        />

        <Flex
          direction="col"
          justify="between"
          gap="6"
          className="relative z-10 md:flex-row md:items-center"
        >
          <Flex align="center" gap="5">
            <Avatar
              src={avatarSrc}
              fallback={(displayName || 'U')[0].toUpperCase()}
              size="xl"
              className="ring-2 ring-border-subtle shadow-xl"
            />
            <Stack gap="2">
              <Flex align="center" gap="2" wrap="wrap">
                <Heading as="h1" size="h2" className="tracking-tight">
                  {displayName}
                </Heading>
                {memberSince && (
                  <Badge variant="glass" size="sm">
                    Member since {memberSince}
                  </Badge>
                )}
              </Flex>
              {email && (
                <Text size="sm" color="secondary">
                  {email}
                </Text>
              )}
              <Flex gap="2" wrap="wrap" className="pt-1">
                <Badge
                  variant={stats?.connectedServices.youtubeExtension ? 'success' : 'neutral'}
                  size="sm"
                >
                  YouTube Music Extension
                </Badge>
                <Badge
                  variant={stats?.connectedServices.spotify ? 'success' : 'neutral'}
                  size="sm"
                >
                  Spotify {stats?.connectedServices.spotify ? 'Connected' : 'Not Linked'}
                </Badge>
              </Flex>
            </Stack>
          </Flex>

          <Flex direction="col" align="start" gap="3" className="md:items-end">
            <SegmentedControl
              options={RANGE_OPTIONS}
              value={range}
              onValueChange={(val) => onRangeChange(val)}
              size="sm"
            />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Share2 className="h-4 w-4" />}
              onClick={onOpenShare}
              disabled={!stats}
            >
              Share Listening Card
            </Button>
          </Flex>
        </Flex>
      </Box>

      <Grid cols={4} gap="4">
        <GlassCard className="p-5">
          <Flex justify="between" align="center" className="mb-2">
            <Text size="xs" color="tertiary" className="uppercase tracking-wider font-semibold">
              Hours Listened
            </Text>
            <Headphones className="h-4 w-4 text-brand-primary" />
          </Flex>
          <Heading as="h2" size="h2" className="tabular-nums">
            {formatHours(stats?.totalListeningSec ?? 0)}
          </Heading>
          <Text size="xs" color="secondary" className="mt-1">
            {Math.round((stats?.totalListeningSec ?? 0) / 60).toLocaleString()} total minutes
          </Text>
        </GlassCard>

        <GlassCard className="p-5">
          <Flex justify="between" align="center" className="mb-2">
            <Text size="xs" color="tertiary" className="uppercase tracking-wider font-semibold">
              Streams
            </Text>
            <Disc3 className="h-4 w-4 text-brand-primary" />
          </Flex>
          <Heading as="h2" size="h2" className="tabular-nums">
            {(stats?.totalStreams ?? 0).toLocaleString()}
          </Heading>
          <Text size="xs" color="secondary" className="mt-1">
            {stats?.uniqueAlbums ?? 0} unique releases
          </Text>
        </GlassCard>

        <GlassCard className="p-5">
          <Flex justify="between" align="center" className="mb-2">
            <Text size="xs" color="tertiary" className="uppercase tracking-wider font-semibold">
              Unique Artists
            </Text>
            <Users className="h-4 w-4 text-brand-primary" />
          </Flex>
          <Heading as="h2" size="h2" className="tabular-nums">
            {(stats?.uniqueArtists ?? 0).toLocaleString()}
          </Heading>
          <Text size="xs" color="secondary" className="mt-1">
            In selected time range
          </Text>
        </GlassCard>

        <GlassCard className="p-5">
          <Flex justify="between" align="center" className="mb-2">
            <Text size="xs" color="tertiary" className="uppercase tracking-wider font-semibold">
              Daily Streak
            </Text>
            <Flame className="h-4 w-4 text-brand-primary" />
          </Flex>
          <Heading as="h2" size="h2" className="tabular-nums">
            {stats?.currentStreakDays ?? 0}d
          </Heading>
          <Text size="xs" color="secondary" className="mt-1">
            Longest: {stats?.longestStreakDays ?? 0} days
          </Text>
        </GlassCard>
      </Grid>
    </Stack>
  );
}
