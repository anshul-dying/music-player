'use client';

import React from 'react';
import Link from 'next/link';
import { Container, PageHeader, Card, CardContent, Stack, Text, Separator } from '@mp/dying';

export default function PrivacyPage() {
  return (
    <Container size="md" className="py-8 px-4 sm:px-6 pb-28">
      <PageHeader title="Privacy Policy" kicker="Your Data" />

      <Card variant="default" className="mt-6 border-border-subtle bg-surface">
        <CardContent className="p-6">
          <Stack gap="5">
            <Stack gap="1">
              <Text size="base" weight="semibold">Account & Library Data (Better Auth)</Text>
              <Text size="sm" color="secondary">
                When you create a GaneGan account, we store your name, email address, hashed credentials (or OAuth identifier), playlists, liked tracks, and play history in PostgreSQL solely to sync your library across devices. You can export all your data as JSON or permanently delete your account at any time from Settings or your Account menu.
              </Text>
            </Stack>

            <Separator />

            <Stack gap="1">
              <Text size="base" weight="semibold">Companion Browser Extension</Text>
              <Text size="sm" color="secondary">
                The GaneGan Companion Extension reads YouTube session cookies locally inside your browser only when you connect YouTube Music, solely to compute client-side SAPISIDHASH headers. Your YouTube cookies are never transmitted to or stored on GaneGan&apos;s servers.
              </Text>
            </Stack>

            <Separator />

            <Stack gap="1">
              <Text size="base" weight="semibold">Spotify OAuth & Playlist Import</Text>
              <Text size="sm" color="secondary">
                If you connect Spotify to import playlists, OAuth tokens are encrypted at rest and used strictly to read your selected playlists/liked tracks and match them to playable tracks.
              </Text>
            </Stack>

            <Separator />

            <Stack gap="1">
              <Text size="base" weight="semibold">Cookies & Local Storage</Text>
              <Text size="sm" color="secondary">
                We use essential session cookies for authentication and browser localStorage for theme preferences, player volume, and guest library state. We do not use third-party advertising trackers.
              </Text>
            </Stack>

            <Separator />

            <Text size="xs" color="tertiary">
              See also our <Link href="/legal" className="text-brand-primary underline">Legal &amp; Disclaimers</Link>.
            </Text>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
