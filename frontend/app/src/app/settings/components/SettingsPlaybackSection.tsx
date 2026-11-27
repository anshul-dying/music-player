'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Stack, Flex, Text, Select, Slider, Badge, Separator } from '@mp/dying';
import { usePlayerStore } from '@/stores/playerStore';

const QUALITY_KEY = 'ganegan-audio-quality';
const CROSSFADE_KEY = 'ganegan-crossfade-sec';

export function SettingsPlaybackSection() {
  const playbackRate = usePlayerStore((s) => s.playbackRate ?? 1.0);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);

  const [quality, setQuality] = useState('auto');
  const [crossfade, setCrossfade] = useState(0);

  useEffect(() => {
    try {
      const q = localStorage.getItem(QUALITY_KEY);
      if (q) setQuality(q);
      const cf = localStorage.getItem(CROSSFADE_KEY);
      if (cf !== null) setCrossfade(Number(cf) || 0);
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleQualityChange = (val: string) => {
    setQuality(val);
    try {
      localStorage.setItem(QUALITY_KEY, val);
    } catch {
      // ignore
    }
  };

  const handleCrossfadeChange = (val: number[]) => {
    const secs = val[0] ?? 0;
    setCrossfade(secs);
    try {
      localStorage.setItem(CROSSFADE_KEY, String(secs));
    } catch {
      // ignore
    }
  };

  return (
    <Card variant="default" className="border-border-subtle bg-surface">
      <CardContent className="p-6">
        <Stack gap="5">
          <Flex justify="between" align="center" className="gap-4">
            <Stack gap="1">
              <Text size="sm" weight="semibold">Audio Quality Preference</Text>
              <Text size="xs" color="secondary">Select preferred codec/bitrate tier when available.</Text>
            </Stack>
            <Select
              value={quality}
              onChange={(e) => handleQualityChange(e.target.value)}
              wrapperClassName="w-56 shrink-0"
            >
              <option value="auto">Auto (Opus 251 / AAC 140)</option>
              <option value="opus">High (Opus 251 · ~160kbps)</option>
              <option value="aac">Compatible (AAC 140 · ~128kbps)</option>
            </Select>
          </Flex>

          <Separator />

          <Stack gap="2">
            <Flex justify="between" align="center">
              <Stack gap="1">
                <Text size="sm" weight="semibold">Crossfade / Prefetch Overlap</Text>
                <Text size="xs" color="secondary">Configure transition overlap window between tracks (0s = gapless).</Text>
              </Stack>
              <Badge variant="glass" size="sm">{crossfade}s</Badge>
            </Flex>
            <Slider
              value={[crossfade]}
              onValueChange={handleCrossfadeChange}
              min={0}
              max={12}
              step={1}
              aria-label="Crossfade duration in seconds"
            />
          </Stack>

          <Separator />

          <Flex justify="between" align="center" className="gap-4">
            <Stack gap="1">
              <Text size="sm" weight="semibold">Playback Speed</Text>
              <Text size="xs" color="secondary">Adjust global playback tempo.</Text>
            </Stack>
            <Select
              value={String(playbackRate)}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              wrapperClassName="w-44 shrink-0"
            >
              <option value="0.75">0.75×</option>
              <option value="1">1.0× (Normal)</option>
              <option value="1.25">1.25×</option>
              <option value="1.5">1.5×</option>
              <option value="2">2.0×</option>
            </Select>
          </Flex>
        </Stack>
      </CardContent>
    </Card>
  );
}
