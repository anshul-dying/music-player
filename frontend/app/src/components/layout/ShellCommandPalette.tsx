'use client';

import React, { useEffect, useState } from 'react';
import {
  CommandPalette,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  useTheme,
  type ResolvedTheme,
} from '@mp/dying';
import {
  Home,
  Compass,
  Search,
  Library,
  User,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Mic2,
  SlidersHorizontal,
  Palette,
  Sparkles,
  EyeOff,
  Settings,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

export interface ShellCommandPaletteProps {
  onNavigate: (path: string) => void;
  onToggleLyrics: () => void;
  onOpenPlaybackOptions: () => void;
}

const THEME_CYCLE: ResolvedTheme[] = ['dark', 'oled', 'light'];

export function ShellCommandPalette({
  onNavigate,
  onToggleLyrics,
  onOpenPlaybackOptions,
}: ShellCommandPaletteProps) {
  const [open, setOpen] = useState(false);

  const playbackState = usePlayerStore((s) => s.playbackState);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);

  const {
    resolvedTheme,
    setTheme,
    dynamicAccentEnabled,
    setDynamicAccentEnabled,
    reduceTransparency,
    setReduceTransparency,
  } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const isPlaying = playbackState === 'playing';
  const nextTheme =
    THEME_CYCLE[(THEME_CYCLE.indexOf(resolvedTheme) + 1) % THEME_CYCLE.length];

  return (
    <CommandPalette open={open} onOpenChange={setOpen} label="App command palette">
      <CommandInput placeholder="Type a command or jump to..." />
      <CommandList>
        <CommandGroup heading="Navigation">
          <CommandItem
            icon={<Home className="h-4 w-4" />}
            keywords={['home', 'discover']}
            onSelect={() => onNavigate('/')}
          >
            Home
          </CommandItem>
          <CommandItem
            icon={<Compass className="h-4 w-4" />}
            keywords={['explore', 'charts', 'moods']}
            onSelect={() => onNavigate('/explore')}
          >
            Explore
          </CommandItem>
          <CommandItem
            icon={<Search className="h-4 w-4" />}
            keywords={['search', 'find']}
            onSelect={() => onNavigate('/search')}
          >
            Search
          </CommandItem>
          <CommandItem
            icon={<Library className="h-4 w-4" />}
            keywords={['library', 'playlists', 'liked']}
            onSelect={() => onNavigate('/library')}
          >
            Library
          </CommandItem>
          <CommandItem
            icon={<User className="h-4 w-4" />}
            keywords={['profile', 'stats', 'analytics', 'heatmap', 'history']}
            onSelect={() => onNavigate('/profile')}
          >
            Profile &amp; Stats
          </CommandItem>
          <CommandItem
            icon={<Settings className="h-4 w-4" />}
            keywords={['settings', 'preferences', 'audio', 'account']}
            onSelect={() => onNavigate('/settings')}
          >
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Playback">
          <CommandItem
            icon={isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            shortcut="Space"
            keywords={['play', 'pause', 'toggle']}
            onSelect={togglePlay}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </CommandItem>
          <CommandItem
            icon={<SkipForward className="h-4 w-4" />}
            shortcut="Shift+N"
            keywords={['next', 'skip']}
            onSelect={next}
          >
            Next Track
          </CommandItem>
          <CommandItem
            icon={<SkipBack className="h-4 w-4" />}
            shortcut="Shift+P"
            keywords={['previous', 'back']}
            onSelect={previous}
          >
            Previous Track
          </CommandItem>
          <CommandItem
            icon={<Mic2 className="h-4 w-4" />}
            shortcut="L"
            keywords={['lyrics', 'sing']}
            onSelect={onToggleLyrics}
          >
            Toggle Lyrics
          </CommandItem>
          <CommandItem
            icon={<SlidersHorizontal className="h-4 w-4" />}
            keywords={['playback', 'options', 'audio', 'quality']}
            onSelect={onOpenPlaybackOptions}
          >
            Playback Options
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Appearance">
          <CommandItem
            icon={<Palette className="h-4 w-4" />}
            shortcut={resolvedTheme.toUpperCase()}
            keywords={['theme', 'dark', 'oled', 'light']}
            onSelect={() => setTheme(nextTheme)}
          >
            Cycle Theme (next: {nextTheme})
          </CommandItem>
          <CommandItem
            icon={<Sparkles className="h-4 w-4" />}
            shortcut={dynamicAccentEnabled ? 'ON' : 'OFF'}
            keywords={['dynamic', 'accent', 'album', 'color']}
            onSelect={() => setDynamicAccentEnabled(!dynamicAccentEnabled)}
          >
            Toggle Dynamic Album Accent
          </CommandItem>
          <CommandItem
            icon={<EyeOff className="h-4 w-4" />}
            shortcut={reduceTransparency ? 'ON' : 'OFF'}
            keywords={['reduce', 'transparency', 'blur', 'accessibility']}
            onSelect={() => setReduceTransparency(!reduceTransparency)}
          >
            Toggle Reduce Transparency
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandPalette>
  );
}
