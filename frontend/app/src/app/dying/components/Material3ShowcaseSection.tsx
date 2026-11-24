'use client';

import React, { useState } from 'react';
import {
  ActivityHeatmap,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Heading,
  MetricBarChart,
  ProgressBar,
  ProgressRing,
  ResponsiveSheet,
  SegmentedControl,
  Separator,
  Slider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  useTheme,
  useToast,
} from '@mp/dying';
import { Bell, Disc3, Layers, Palette, Sparkles } from 'lucide-react';

const SEED_ARTWORKS = [
  {
    name: 'Crimson',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="%23fa243c"/></svg>',
  },
  {
    name: 'Emerald',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="%2310b981"/></svg>',
  },
  {
    name: 'Cobalt',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="%233b82f6"/></svg>',
  },
  {
    name: 'Amber',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="%23f59e0b"/></svg>',
  },
];

const HEATMAP_DATA = Array.from({ length: 14 * 7 }, (_, i) => ({
  date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
  count: ((i * 7 + 3) % 11),
}));

const BAR_DATA = [
  { label: 'Mon', value: 42 },
  { label: 'Tue', value: 68 },
  { label: 'Wed', value: 55 },
  { label: 'Thu', value: 91 },
  { label: 'Fri', value: 76 },
  { label: 'Sat', value: 112 },
  { label: 'Sun', value: 84 },
];

export function Material3ShowcaseSection() {
  const { toast } = useToast();
  const {
    dynamicAccentEnabled,
    setDynamicAccentEnabled,
    setDynamicSeedUrl,
    reduceTransparency,
    setReduceTransparency,
  } = useTheme();

  const [segment, setSegment] = useState<'week' | 'month' | 'year'>('week');
  const [sliderVal, setSliderVal] = useState<number[]>([64]);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Badge variant="accent" size="sm">Material 3 + Adaptive</Badge>
        <Heading level={2} size="h2">Adaptive Color, Sheets & Telemetry</Heading>
        <Text variant="secondary" size="sm">
          Interactive showcase of tonal elevation, OKLCH dynamic album accents, reduced transparency,
          and new @mp/dying primitives.
        </Text>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-brand-primary" />
              Adaptive Theme Controls
            </CardTitle>
            <CardDescription>
              Live toggles for Dynamic Album Accent and Reduce Transparency.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Text size="sm" className="font-medium">Dynamic Album Accent</Text>
                <Text variant="secondary" size="xs">
                  Extracts WCAG-safe OKLCH accent tokens from artwork
                </Text>
              </div>
              <Switch
                checked={dynamicAccentEnabled}
                onCheckedChange={setDynamicAccentEnabled}
                aria-label="Toggle Dynamic Album Accent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {SEED_ARTWORKS.map((seed) => (
                <Button
                  key={seed.name}
                  size="xs"
                  variant="outline"
                  leftIcon={<Disc3 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setDynamicAccentEnabled(true);
                    setDynamicSeedUrl(seed.url);
                  }}
                >
                  {seed.name}
                </Button>
              ))}
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setDynamicSeedUrl(null)}
              >
                Reset Seed
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Text size="sm" className="font-medium">Reduce Transparency</Text>
                <Text variant="secondary" size="xs">
                  Replaces acrylic blur surfaces with solid elevation tokens
                </Text>
              </div>
              <Switch
                checked={reduceTransparency}
                onCheckedChange={setReduceTransparency}
                aria-label="Toggle Reduce Transparency"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-primary" />
              Buttons, Toasts & Responsive Sheet
            </CardTitle>
            <CardDescription>
              Primary vs accent buttons, toast feedback, and adaptive dialog/bottom sheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm">Primary Action</Button>
              <Button variant="accent" size="sm">Accent Action</Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Bell className="h-3.5 w-3.5" />}
                onClick={() =>
                  toast({
                    title: 'Added to Liked Songs',
                    description: 'Dynamic toast notification from @mp/dying',
                    variant: 'success',
                  })
                }
              >
                Trigger Toast
              </Button>
              <ResponsiveSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                trigger={
                  <Button variant="secondary" size="sm" leftIcon={<Layers className="h-3.5 w-3.5" />}>
                    Open Sheet
                  </Button>
                }
                title="Adaptive ResponsiveSheet"
                description="Renders as a centered Dialog on desktop and a spring BottomSheet on mobile."
              >
                <div className="space-y-4 py-2">
                  <Text variant="secondary" size="sm">
                    Resize the viewport below 768px to see the mobile BottomSheet presentation.
                  </Text>
                  <Button variant="accent" size="sm" onClick={() => setSheetOpen(false)}>
                    Done
                  </Button>
                </div>
              </ResponsiveSheet>
            </div>

            <Separator />

            <div className="space-y-4">
              <Slider
                label="Playback Volume"
                showValue
                formatValue={(v) => `${v}%`}
                value={sliderVal}
                onValueChange={setSliderVal}
                max={100}
              />
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <ProgressBar label="Sync Progress" value={sliderVal[0] ?? 64} showValue />
                </div>
                <ProgressRing value={sliderVal[0] ?? 64} showValue size={52} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Tabs, Segmented Control & Data Visualization</CardTitle>
            <CardDescription>
              Listening activity heatmap and metric bar chart using semantic brand tokens.
            </CardDescription>
          </div>
          <SegmentedControl
            size="sm"
            value={segment}
            onValueChange={setSegment}
            options={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Year' },
            ]}
          />
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="heatmap" variant="underline">
            <TabsList>
              <TabsTrigger value="heatmap">Activity Heatmap</TabsTrigger>
              <TabsTrigger value="bars">Metric Bar Chart</TabsTrigger>
            </TabsList>
            <TabsContent value="heatmap">
              <ActivityHeatmap
                data={HEATMAP_DATA}
                weeks={14}
                title={`Listening activity (${segment})`}
              />
            </TabsContent>
            <TabsContent value="bars">
              <MetricBarChart
                data={BAR_DATA}
                formatValue={(v) => `${v}m`}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
