'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Flex,
  Box,
  Button,
  IconButton,
  Input,
  Badge,
  Avatar,
  Tooltip,
  ThemeSwitcher,
} from '@mp/dying';
import { Search, Cast, LogIn, X } from 'lucide-react';
import { type UserProfile } from '../../stores/authStore';
import { useYouTubeAuthStore } from '../../stores/youtubeAuthStore';

export interface ShellHeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onClearSearch: () => void;
  onSubmitSearch?: () => void;
  hasMounted: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;
  onOpenAccountModal: () => void;
}

export function ShellHeader({
  searchQuery,
  onSearchChange,
  onClearSearch,
  onSubmitSearch,
  hasMounted,
  isAuthenticated,
  user,
  onOpenAccountModal,
}: ShellHeaderProps) {
  const router = useRouter();
  const ytAccount = useYouTubeAuthStore((s) => s.youtubeAccount);
  const avatarSrc = user?.image || (user as any)?.avatarUrl || (ytAccount as any)?.avatarUrl || ytAccount?.avatar || undefined;
  const displayName = user?.name || ytAccount?.name || 'User';

  return (
    <Flex justify="between" align="center" className="h-16 px-4 md:px-8 gap-4 select-none">
      {/* Centered Large Search Pill */}
      <Box className="flex-1 max-w-2xl mx-auto">
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmitSearch) {
              onSubmitSearch();
            }
          }}
          placeholder="Search songs, albums, artists, podcasts"
          leftIcon={<Search className="h-4 w-4 text-text-tertiary" />}
          rightIcon={
            searchQuery ? (
              <IconButton
                aria-label="Clear search"
                variant="ghost"
                size="xs"
                shape="circle"
                icon={<X size={14} />}
                onClick={onClearSearch}
              />
            ) : (
              <Badge variant="glass" size="sm" className="pointer-coarse:hidden">
                ⌘K
              </Badge>
            )
          }
          className="rounded-full bg-surface/80 border-border-subtle focus:bg-surface text-sm"
        />
      </Box>

      {/* Right Action Icons: Cast, Theme, User Avatar */}
      <Flex gap="2" align="center" className="shrink-0">
        <Tooltip content="Cast / AirPlay">
          <IconButton
            aria-label="Cast audio"
            variant="ghost"
            size="md"
            shape="circle"
            icon={<Cast size={18} />}
            onClick={() => alert('AirPlay / Cast device selector')}
          />
        </Tooltip>

        <Tooltip content="Appearance (System / Light / Dark)">
          <ThemeSwitcher size="sm" />
        </Tooltip>

        {hasMounted && (isAuthenticated || ytAccount?.name) ? (
          <Tooltip content={`Account: ${displayName}`}>
            <Avatar
              src={avatarSrc}
              fallback={(displayName || 'U')[0].toUpperCase()}
              size="sm"
              aria-label={`User Account: ${displayName}`}
              onClick={onOpenAccountModal}
              className="cursor-pointer select-none"
            />
          </Tooltip>
        ) : (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<LogIn size={14} />}
            onClick={() => router.push('/login')}
          >
            Sign In
          </Button>
        )}
      </Flex>
    </Flex>
  );
}
