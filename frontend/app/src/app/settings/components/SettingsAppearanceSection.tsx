'use client';

import React from 'react';
import { Card, CardContent, Stack, Flex, Text, Switch, Select, Separator, useTheme, type Theme } from '@mp/dying';

export function SettingsAppearanceSection() {
  const {
    theme,
    setTheme,
    dynamicAccentEnabled,
    setDynamicAccentEnabled,
    reduceTransparency,
    setReduceTransparency,
  } = useTheme();

  return (
    <Card variant="default" className="border-border-subtle bg-surface">
      <CardContent className="p-6">
        <Stack gap="5">
          <Flex justify="between" align="center" className="gap-4">
            <Stack gap="1">
              <Text size="sm" weight="semibold">Theme Mode</Text>
              <Text size="xs" color="secondary">Choose Dark Graphite, pure OLED Black, Light, or follow OS.</Text>
            </Stack>
            <Select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              wrapperClassName="w-44 shrink-0"
            >
              <option value="oled">OLED Black</option>
              <option value="dark">Dark Graphite</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </Select>
          </Flex>

          <Separator />

          <Flex justify="between" align="center" className="gap-4">
            <Stack gap="1">
              <Text size="sm" weight="semibold">Dynamic Album Accent</Text>
              <Text size="xs" color="secondary">Adapt UI accent color to the currently playing track artwork.</Text>
            </Stack>
            <Switch
              checked={dynamicAccentEnabled}
              onCheckedChange={setDynamicAccentEnabled}
              aria-label="Toggle Dynamic Album Accent"
            />
          </Flex>

          <Separator />

          <Flex justify="between" align="center" className="gap-4">
            <Stack gap="1">
              <Text size="sm" weight="semibold">Reduce Transparency</Text>
              <Text size="xs" color="secondary">Replace blurred acrylic panels with solid elevated surfaces.</Text>
            </Stack>
            <Switch
              checked={reduceTransparency}
              onCheckedChange={setReduceTransparency}
              aria-label="Toggle Reduce Transparency"
            />
          </Flex>
        </Stack>
      </CardContent>
    </Card>
  );
}
