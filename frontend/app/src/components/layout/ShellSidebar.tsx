'use client';

import React from 'react';
import {
  Sidebar,
  SidebarBrand,
  BrandLogo,
  SidebarNav,
  SidebarNavItem,
  SidebarFooter,
  IconButton,
  Badge,
} from '@mp/dying';
import {
  Home,
  Compass,
  Library,
  Plus,
  Heart,
  Sparkles,
  Youtube,
  Puzzle,
} from 'lucide-react';
import { type Playlist } from '../../stores/libraryStore';
import { useYouTubeAuthStore } from '../../stores/youtubeAuthStore';

export interface ShellSidebarProps {
  playlists: Playlist[];
  pathname: string;
  onNavigate: (path: string) => void;
  onCreatePlaylist: () => void;
}

export function ShellSidebar({
  playlists,
  pathname,
  onNavigate,
  onCreatePlaylist,
}: ShellSidebarProps) {
  const syncedPlaylists = useYouTubeAuthStore((s) => s.syncedPlaylists);
  const isExtensionInstalled = useYouTubeAuthStore((s) => s.isExtensionInstalled);
  const allPlaylists: Playlist[] = [
    ...playlists,
    ...syncedPlaylists
      .filter((sp) => !playlists.some((p) => p.id === sp.id))
      .map((sp): Playlist => ({
        id: sp.id,
        name: sp.title || sp.name || 'YouTube Playlist',
        source: 'youtube',
        trackCount: sp.trackCount || 0,
        createdAt: new Date().toISOString(),
      })),
  ];
  return (
    <Sidebar>
      <div className="cursor-pointer" onClick={() => onNavigate('/')}>
        <SidebarBrand
          logo={<BrandLogo variant="app-icon" size={28} />}
          title={<BrandLogo variant="wordmark" size="sm" />}
          subtitle="Streaming"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarNav title="Menu">
          <SidebarNavItem
            icon={<Home className="h-4 w-4" />}
            label="Home"
            active={pathname === '/'}
            onClick={() => onNavigate('/')}
          />
          <SidebarNavItem
            icon={<Compass className="h-4 w-4" />}
            label="Explore"
            active={pathname === '/explore'}
            onClick={() => onNavigate('/explore')}
          />
          <SidebarNavItem
            icon={<Library className="h-4 w-4" />}
            label="Library"
            active={pathname === '/library'}
            onClick={() => onNavigate('/library')}
          />
        </SidebarNav>

        <SidebarNav
          title="Playlists"
          action={
            <IconButton
              aria-label="Create new playlist"
              variant="ghost"
              size="xs"
              icon={<Plus size={14} />}
              onClick={onCreatePlaylist}
            />
          }
        >
          <SidebarNavItem
            icon={<Heart className="h-4 w-4 text-emerald-400" />}
            label="Liked music"
            active={pathname === '/playlist/liked'}
            onClick={() => onNavigate('/playlist/liked')}
          />

          {allPlaylists.map((pl) => (
            <SidebarNavItem
              key={pl.id}
              icon={
                pl.source === 'youtube' ? (
                  <Youtube className="h-4 w-4 text-red-500" />
                ) : (
                  <Library className="h-4 w-4" />
                )
              }
              label={pl.name}
              badge={
                pl.source === 'youtube' ? (
                  <Badge variant="glass" size="xs">
                    YT
                  </Badge>
                ) : undefined
              }
              active={pathname === `/playlist/${pl.id}`}
              onClick={() => onNavigate(`/playlist/${pl.id}`)}
            />
          ))}
        </SidebarNav>
      </div>

      <SidebarFooter>
        <SidebarNavItem
          icon={<Puzzle className="h-4 w-4 text-emerald-400" />}
          label="Extension"
          badge={
            isExtensionInstalled ? (
              <Badge variant="glass" size="xs">
                Active
              </Badge>
            ) : (
              <Badge variant="glass" size="xs">
                Get
              </Badge>
            )
          }
          active={pathname === '/extension'}
          onClick={() => onNavigate('/extension')}
        />
        {process.env.NODE_ENV === 'development' && (
          <SidebarNavItem
            icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
            label="Dying 2.0 Design System"
            onClick={() => onNavigate('/dying')}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
