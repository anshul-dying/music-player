'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Container,
  EmptyState,
  Skeleton,
  Stack,
} from '@mp/dying';
import type { ProfileStatsRange, ProfileStatsResponse } from '@mp/api-contract';
import { LogIn, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useYouTubeAuthStore } from '../../stores/youtubeAuthStore';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileAnalyticsSection } from './components/ProfileAnalyticsSection';
import { ProfileLeaderboards } from './components/ProfileLeaderboards';
import { ShareListeningCardModal } from './components/ShareListeningCardModal';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const ytAccount = useYouTubeAuthStore((s) => s.youtubeAccount);

  const [range, setRange] = useState<ProfileStatsRange>('30d');
  const [stats, setStats] = useState<ProfileStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/profile/stats?range=${range}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load profile stats (${res.status})`);
        return (await res.json()) as ProfileStatsResponse;
      })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load stats');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, range]);

  const displayName = user?.name || ytAccount?.name || 'Listener';
  const avatarSrc = user?.image || ytAccount?.avatar || undefined;

  if (!authLoading && !isAuthenticated) {
    return (
      <Container size="lg" className="py-16">
        <EmptyState
          icon={<User className="h-10 w-10 text-text-tertiary" />}
          title="Sign in to view your listening profile"
          description="Your 365-day listening heatmap, streaks, top tracks, and audio telemetry are synced to your GaneGan account."
          actionSlot={
            <Button
              variant="primary"
              leftIcon={<LogIn className="h-4 w-4" />}
              onClick={() => router.push('/login')}
            >
              Sign In
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container size="xl" className="py-6 sm:py-8">
      <Stack gap="6">
        <ProfileHeader
          displayName={displayName}
          email={user?.email}
          avatarSrc={avatarSrc}
          range={range}
          onRangeChange={setRange}
          stats={stats}
          onOpenShare={() => setShareOpen(true)}
        />

        {error && (
          <Alert variant="error" title="Could not load listening stats">
            {error}
          </Alert>
        )}

        {loading && !stats ? (
          <Stack gap="4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </Stack>
        ) : stats ? (
          <>
            <ProfileAnalyticsSection stats={stats} />
            <ProfileLeaderboards stats={stats} />
            <ShareListeningCardModal
              open={shareOpen}
              onOpenChange={setShareOpen}
              displayName={displayName}
              range={range}
              stats={stats}
            />
          </>
        ) : null}
      </Stack>
    </Container>
  );
}
