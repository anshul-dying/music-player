'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, notFound } from 'next/navigation';
import {
  ArrowLeft,
  Music,
  Disc,
  Moon,
  Sun,
  Calculator,
  Compass,
  CheckSquare,
  Layers,
} from 'lucide-react';
import {
  OledBase,
  Text,
  Heading,
  Separator,
  Button,
  Badge,
} from '@mp/dying';
import { ComponentsSection } from './components/ComponentsSection';
import { MathSection } from './components/MathSection';
import { TokensSection } from './components/TokensSection';
import { ChecklistSection } from './components/ChecklistSection';
import { MusicSection } from './components/MusicSection';

function DyingPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state synced with URL search params
  const tabParam = searchParams.get('tab');
  const validTabs = ['components', 'math', 'tokens', 'checklist', 'audio'];
  const initialTab = validTabs.includes(tabParam || '') ? tabParam! : 'components';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Component states
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'oled' | 'light'>('dark');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/dying?tab=${tab}`, { scroll: false });
  };

  const handleThemeChange = (newTheme: 'dark' | 'oled' | 'light') => {
    setCurrentTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  return (
    <OledBase grain={true}>
      {/* Top Header Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-canvas/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-white transition-colors p-2 rounded-lg hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <ArrowLeft size={16} />
              <span>Back to Music Player</span>
            </Link>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <Badge variant="accent" size="sm">DYING v2.0</Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary hidden sm:inline">Theme:</span>
            <div className="flex rounded-lg border border-border-subtle bg-surface p-0.5">
              <Button
                variant={currentTheme === 'dark' ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => handleThemeChange('dark')}
                leftIcon={<Moon size={13} />}
                className="h-7 px-2"
                aria-label="Switch to Dark theme"
              >
                <span className="hidden sm:inline">Dark</span>
              </Button>
              <Button
                variant={currentTheme === 'oled' ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => handleThemeChange('oled')}
                leftIcon={<Disc size={13} />}
                className="h-7 px-2"
                aria-label="Switch to OLED theme"
              >
                <span className="hidden sm:inline">OLED</span>
              </Button>
              <Button
                variant={currentTheme === 'light' ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => handleThemeChange('light')}
                leftIcon={<Sun size={13} />}
                className="h-7 px-2"
                aria-label="Switch to Light theme"
              >
                <span className="hidden sm:inline">Light</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Enterprise Portal Tabs */}
        <div className="border-t border-border-subtle/50 bg-surface/40 px-4 sm:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto py-2 no-scrollbar">
            <Button
              variant={activeTab === 'components' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('components')}
              leftIcon={<Layers size={14} />}
            >
              Components & Primitives
            </Button>
            <Button
              variant={activeTab === 'math' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('math')}
              leftIcon={<Calculator size={14} />}
            >
              Mathematical Rigor & Physics
            </Button>
            <Button
              variant={activeTab === 'tokens' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('tokens')}
              leftIcon={<Compass size={14} />}
            >
              Design Tokens & DTCG
            </Button>
            <Button
              variant={activeTab === 'checklist' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('checklist')}
              leftIcon={<CheckSquare size={14} />}
            >
              20-Point Checklist Audit
            </Button>
            <Button
              variant={activeTab === 'audio' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('audio')}
              leftIcon={<Music size={14} />}
            >
              Audio Domain Patterns
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8 space-y-12">
        {/* Hero Section */}
        <section className="flex flex-col gap-3 border-b border-border-subtle pb-8">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-status-success" />
            <Text variant="kicker" size="xs">Dying Design System 2.0</Text>
          </div>
          <Heading level={1} size="h1">
            Enterprise Design System Portal
          </Heading>
          <Text variant="secondary" size="base" className="max-w-3xl leading-relaxed">
            The authoritative single source of truth for UI engineering, W3C DTCG tokens,
            CIELAB perceptual lightness math, and Apple Music Dark Mode aesthetics.
          </Text>
        </section>

        {activeTab === 'components' && <ComponentsSection />}
        {activeTab === 'math' && <MathSection currentTheme={currentTheme} />}
        {activeTab === 'tokens' && <TokensSection />}
        {activeTab === 'checklist' && <ChecklistSection />}
        {activeTab === 'audio' && <MusicSection />}
      </main>
    </OledBase>
  );
}

export default function DyingPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <DyingPortalContent />
    </Suspense>
  );
}
