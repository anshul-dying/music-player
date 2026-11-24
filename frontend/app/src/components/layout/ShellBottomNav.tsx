'use client';

import React from 'react';
import { BottomNav, BottomNavItem } from '@mp/dying';
import { Home, Compass, Search, Library } from 'lucide-react';

export interface ShellBottomNavProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

export function ShellBottomNav({ pathname, onNavigate }: ShellBottomNavProps) {
  return (
    <BottomNav>
      <BottomNavItem
        icon={<Home className="h-5 w-5" />}
        label="Home"
        active={pathname === '/'}
        onClick={() => onNavigate('/')}
      />
      <BottomNavItem
        icon={<Compass className="h-5 w-5" />}
        label="Explore"
        active={pathname === '/explore'}
        onClick={() => onNavigate('/explore')}
      />
      <BottomNavItem
        icon={<Search className="h-5 w-5" />}
        label="Search"
        active={pathname === '/search'}
        onClick={() => onNavigate('/search')}
      />
      <BottomNavItem
        icon={<Library className="h-5 w-5" />}
        label="Library"
        active={pathname === '/library'}
        onClick={() => onNavigate('/library')}
      />
    </BottomNav>
  );
}
