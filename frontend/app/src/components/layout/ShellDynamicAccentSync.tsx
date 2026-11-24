'use client';

import { useEffect } from 'react';
import { useTheme } from '@mp/dying';
import { usePlayerStore } from '../../stores/playerStore';

export function ShellDynamicAccentSync() {
  const thumbnail = usePlayerStore((s) => s.currentTrack?.thumbnail);
  const { setDynamicSeedUrl } = useTheme();

  useEffect(() => {
    setDynamicSeedUrl(thumbnail || null);
  }, [thumbnail, setDynamicSeedUrl]);

  return null;
}
