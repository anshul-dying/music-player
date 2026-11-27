'use client';

import React from 'react';
import Link from 'next/link';
import { Container, PageHeader, Card, CardContent, Stack, Text, Separator } from '@mp/dying';

export default function LegalPage() {
  return (
    <Container size="md" className="py-8 px-4 sm:px-6 pb-28">
      <PageHeader title="Legal & Disclaimers" kicker="Compliance" />

      <Card variant="default" className="mt-6 border-border-subtle bg-surface">
        <CardContent className="p-6">
          <Stack gap="5">
            <Stack gap="1">
              <Text size="base" weight="semibold">Non-Affiliation Disclaimer</Text>
              <Text size="sm" color="secondary">
                GaneGan is an independent, clean-room web music client. It is not affiliated with, endorsed by, or sponsored by YouTube, Google LLC, or Spotify AB. All trademarks, service marks, and catalog metadata belong to their respective owners.
              </Text>
            </Stack>

            <Separator />

            <Stack gap="1">
              <Text size="base" weight="semibold">Zero Audio Hosting & Client-Side Streaming</Text>
              <Text size="sm" color="secondary">
                GaneGan does not host, store, cache, or redistribute copyrighted audio or video files on its servers. Metadata and media streams are resolved directly between the user&apos;s client and upstream providers. Users are responsible for complying with local copyright laws and upstream terms of service.
              </Text>
            </Stack>

            <Separator />

            <Stack gap="1">
              <Text size="base" weight="semibold">DMCA & Takedown Posture</Text>
              <Text size="sm" color="secondary">
                Because GaneGan indexes public upstream identifiers without hosting media files, copyright removal requests should be directed to the upstream media host. For application-level inquiries or abuse reports regarding this instance, please contact the repository maintainer via GitHub.
              </Text>
            </Stack>

            <Separator />

            <Text size="xs" color="tertiary">
              See also our <Link href="/privacy" className="text-brand-primary underline">Privacy Policy</Link>.
            </Text>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
