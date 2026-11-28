'use client';

import React, { useState } from 'react';
import {
  ActivityHeatmap,
  Badge,
  Card,
  Flex,
  Grid,
  Heading,
  MetricBarChart,
  ProgressBar,
  Stack,
  Text,
} from '@mp/dying';
import type { ProfileStatsResponse } from '@mp/api-contract';
import { Activity, Cpu, Gauge } from 'lucide-react';

export interface ProfileAnalyticsSectionProps {
  stats: ProfileStatsResponse;
}

export function ProfileAnalyticsSection({ stats }: ProfileAnalyticsSectionProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const selectedEntry = selectedDate
    ? stats.activityDays.find((d) => d.date === selectedDate)
    : null;

  const barData = stats.hourlyDistribution.map((b) => ({
    label: b.label,
    value: b.count,
    hint: `${b.label}:00 UTC — ${b.count} streams (${Math.round(b.totalMs / 60_000)}m)`,
  }));

  return (
    <Stack gap="6">
      <ActivityHeatmap
        data={stats.activityDays}
        title="365-Day Listening Rhythm"
        period="the last year"
        unit={{ one: 'stream', other: 'streams' }}
        selectedDate={selectedDate}
        onSelectDate={(date) => setSelectedDate((prev) => (prev === date ? null : date))}
        actions={
          selectedEntry ? (
            <Badge variant="accent" size="xs">
              {selectedEntry.date}: {selectedEntry.count} streams
            </Badge>
          ) : undefined
        }
      />

      <Grid cols={1} gap="6" className="lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <Flex justify="between" align="center" className="mb-4">
            <Stack gap="1">
              <Heading as="h2" size="h4">
                24-Hour Listening Clock
              </Heading>
              <Text size="xs" color="secondary">
                Streams by UTC hour of day
              </Text>
            </Stack>
            <Activity className="h-4 w-4 text-brand-primary" />
          </Flex>
          <MetricBarChart
            data={barData}
            height={160}
            formatValue={(v) => `${v}`}
          />
        </Card>

        <Card className="p-5 sm:p-6">
          <Flex justify="between" align="center" className="mb-4">
            <Stack gap="1">
              <Heading as="h2" size="h4">
                Audio Nerd Telemetry
              </Heading>
              <Text size="xs" color="secondary">
                InnerTube codec &amp; playback profile
              </Text>
            </Stack>
            <Cpu className="h-4 w-4 text-brand-primary" />
          </Flex>

          <Stack gap="5">
            <Flex justify="between" align="baseline">
              <Text size="sm" color="secondary">
                Average Bitrate
              </Text>
              <Heading as="h3" size="h3" className="tabular-nums">
                {stats.telemetry.avgBitrateKbps} kbps
              </Heading>
            </Flex>

            <Stack gap="2">
              <Flex justify="between" align="center">
                <Text size="xs" color="secondary">
                  Opus (itag 251)
                </Text>
                <Text size="xs" weight="semibold" className="tabular-nums">
                  {stats.telemetry.opusItag251Pct}%
                </Text>
              </Flex>
              <ProgressBar value={stats.telemetry.opusItag251Pct} max={100} size="md" />
              <Flex justify="between" align="center">
                <Text size="xs" color="tertiary">
                  AAC (itag 140)
                </Text>
                <Text size="xs" color="tertiary" className="tabular-nums">
                  {stats.telemetry.aacItag140Pct}%
                </Text>
              </Flex>
            </Stack>

            <Flex
              justify="between"
              align="center"
              className="rounded-xl border border-border-subtle bg-surface-elevated px-3.5 py-2.5"
            >
              <Flex align="center" gap="2">
                <Gauge className="h-4 w-4 text-brand-primary" />
                <Text size="sm" color="secondary">
                  Preferred Speed
                </Text>
              </Flex>
              <Badge variant="glass" size="sm" className="tabular-nums">
                {stats.telemetry.preferredSpeed.toFixed(1)}x
              </Badge>
            </Flex>
          </Stack>
        </Card>
      </Grid>
    </Stack>
  );
}
