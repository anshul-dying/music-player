'use client';

import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Flex,
  Grid,
  Heading,
  Stack,
  Text,
} from '@mp/dying';
import type { ProfileStatsRange, ProfileStatsResponse } from '@mp/api-contract';
import { Check, Copy, Download, ImageDown } from 'lucide-react';

export interface ShareListeningCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  range: ProfileStatsRange;
  stats: ProfileStatsResponse;
}

const RANGE_LABEL: Record<ProfileStatsRange, string> = {
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '1y': 'This Year',
  all: 'All Time',
};

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildCardSvg(displayName: string, range: ProfileStatsRange, stats: ProfileStatsResponse): string {
  const hours = (stats.totalListeningSec / 3600).toFixed(1);
  const topArtist = stats.topArtists[0]?.artist ?? 'No streams yet';
  const topTrack = stats.topTracks[0]?.title ?? 'No streams yet';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="440" viewBox="0 0 800 440">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#09090b"/>
      <stop offset="55%" stop-color="#141416"/>
      <stop offset="100%" stop-color="#2a1210"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#D6452B"/>
      <stop offset="100%" stop-color="#FF6A4D"/>
    </linearGradient>
  </defs>
  <rect width="800" height="440" rx="28" fill="url(#bg)"/>
  <rect x="1" y="1" width="798" height="438" rx="27" fill="none" stroke="#2c2c32" stroke-width="2"/>
  <rect x="44" y="42" width="144" height="28" rx="14" fill="url(#accent)"/>
  <text x="116" y="61" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-size="13" font-weight="700">GANEGAN AUDIO</text>
  <text x="756" y="61" text-anchor="end" fill="#a1a1aa" font-family="system-ui,sans-serif" font-size="14">${escapeXml(RANGE_LABEL[range])}</text>
  <text x="44" y="120" fill="#fafafa" font-family="system-ui,sans-serif" font-size="34" font-weight="800">${escapeXml(displayName)}</text>
  <text x="44" y="150" fill="#a1a1aa" font-family="system-ui,sans-serif" font-size="16">Listening Card Snapshot</text>
  <text x="44" y="232" fill="#FF6A4D" font-family="system-ui,sans-serif" font-size="44" font-weight="800">${hours}h</text>
  <text x="44" y="258" fill="#a1a1aa" font-family="system-ui,sans-serif" font-size="14">Hours Listened</text>
  <text x="290" y="232" fill="#fafafa" font-family="system-ui,sans-serif" font-size="44" font-weight="800">${stats.totalStreams}</text>
  <text x="290" y="258" fill="#a1a1aa" font-family="system-ui,sans-serif" font-size="14">Total Streams</text>
  <text x="540" y="232" fill="#fafafa" font-family="system-ui,sans-serif" font-size="44" font-weight="800">${stats.currentStreakDays}d</text>
  <text x="540" y="258" fill="#a1a1aa" font-family="system-ui,sans-serif" font-size="14">Daily Streak</text>
  <line x1="44" y1="296" x2="756" y2="296" stroke="#2c2c32" stroke-width="1"/>
  <text x="44" y="336" fill="#a1a1aa" font-family="system-ui,sans-serif" font-size="13">TOP ARTIST</text>
  <text x="44" y="366" fill="#fafafa" font-family="system-ui,sans-serif" font-size="20" font-weight="700">${escapeXml(topArtist.slice(0, 30))}</text>
  <text x="410" y="336" fill="#a1a1aa" font-family="system-ui,sans-serif" font-size="13">TOP TRACK</text>
  <text x="410" y="366" fill="#fafafa" font-family="system-ui,sans-serif" font-size="20" font-weight="700">${escapeXml(topTrack.slice(0, 30))}</text>
  <text x="44" y="408" fill="#71717a" font-family="system-ui,sans-serif" font-size="12">Avg ${stats.telemetry.avgBitrateKbps} kbps · ${stats.telemetry.opusItag251Pct}% Opus</text>
</svg>`;
}

export function ShareListeningCardModal({
  open,
  onOpenChange,
  displayName,
  range,
  stats,
}: ShareListeningCardModalProps) {
  const [copied, setCopied] = useState(false);

  const handleDownloadSvg = () => {
    const svg = buildCardSvg(displayName, range, stats);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ganegan-listening-card-${range}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = async () => {
    const svg = buildCardSvg(displayName, range, stats);
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 880;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return;
          const pngUrl = URL.createObjectURL(pngBlob);
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `ganegan-listening-card-${range}.png`;
          a.click();
          URL.revokeObjectURL(pngUrl);
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleCopySummary = async () => {
    const hours = (stats.totalListeningSec / 3600).toFixed(1);
    const topArtist = stats.topArtists[0]?.artist ?? 'N/A';
    const topTrack = stats.topTracks[0]?.title ?? 'N/A';
    const summary = `GaneGan Listening Card (${RANGE_LABEL[range]})\n${displayName}: ${hours}h · ${stats.totalStreams} streams · ${stats.currentStreakDays}d streak\nTop Artist: ${topArtist}\nTop Track: ${topTrack}`;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share Listening Card</DialogTitle>
          <DialogDescription>
            Export your GaneGan listening snapshot as PNG, SVG, or copy a summary.
          </DialogDescription>
        </DialogHeader>

        <Box className="rounded-2xl border border-border-subtle bg-canvas p-6">
          <Flex justify="between" align="center" className="mb-4">
            <Badge variant="accent" size="sm">
              GaneGan Audio
            </Badge>
            <Text size="xs" color="tertiary">
              {RANGE_LABEL[range]}
            </Text>
          </Flex>

          <Heading as="h3" size="h3">
            {displayName}
          </Heading>

          <Grid cols={3} gap="4" className="my-5">
            <Stack gap="0">
              <Heading as="h4" size="h3" className="text-brand-primary tabular-nums">
                {(stats.totalListeningSec / 3600).toFixed(1)}h
              </Heading>
              <Text size="xs" color="secondary">
                Listened
              </Text>
            </Stack>
            <Stack gap="0">
              <Heading as="h4" size="h3" className="tabular-nums">
                {stats.totalStreams}
              </Heading>
              <Text size="xs" color="secondary">
                Streams
              </Text>
            </Stack>
            <Stack gap="0">
              <Heading as="h4" size="h3" className="tabular-nums">
                {stats.currentStreakDays}d
              </Heading>
              <Text size="xs" color="secondary">
                Streak
              </Text>
            </Stack>
          </Grid>

          <Grid cols={2} gap="4" className="border-t border-border-subtle pt-4">
            <Stack gap="0" className="min-w-0">
              <Text size="xs" color="tertiary">
                Top Artist
              </Text>
              <Text size="sm" weight="semibold" className="truncate">
                {stats.topArtists[0]?.artist ?? 'No streams yet'}
              </Text>
            </Stack>
            <Stack gap="0" className="min-w-0">
              <Text size="xs" color="tertiary">
                Top Track
              </Text>
              <Text size="sm" weight="semibold" className="truncate">
                {stats.topTracks[0]?.title ?? 'No streams yet'}
              </Text>
            </Stack>
          </Grid>
        </Box>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            onClick={handleCopySummary}
          >
            {copied ? 'Copied' : 'Copy Summary'}
          </Button>
          <Flex gap="2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleDownloadSvg}
            >
              SVG
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ImageDown className="h-4 w-4" />}
              onClick={handleDownloadPng}
            >
              PNG
            </Button>
          </Flex>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
