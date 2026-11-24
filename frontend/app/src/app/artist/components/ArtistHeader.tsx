'use client';

import React, { useState } from 'react';
import { Play, Pause, Shuffle, Radio, Share2, Check, Users } from 'lucide-react';
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Badge,
  Button,
  IconButton,
} from '@mp/dying';
import { type ArtistDetails } from '@mp/player-core';

export interface ArtistHeaderProps {
  artist: ArtistDetails;
  isThisArtistPlaying: boolean;
  onPlayAll: (shuffle?: boolean) => void;
  onRadio?: () => void;
  onShare?: () => void;
}

export function ArtistHeader({
  artist,
  isThisArtistPlaying,
  onPlayAll,
  onRadio,
  onShare,
}: ArtistHeaderProps) {
  const [copied, setCopied] = useState(false);
  const heroImage = artist.bannerUrl || artist.avatarUrl || '';

  const handleShare = () => {
    if (onShare) {
      onShare();
      return;
    }
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box className="relative h-64 sm:h-80 md:h-96 rounded-3xl overflow-hidden border border-border-subtle bg-surface mb-10 shadow-2xl">
      {heroImage && (
        <img
          src={heroImage}
          alt={artist.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <Stack gap="2" className="max-w-2xl">
          <Flex align="center" gap="2">
            <Badge variant="glass" className="border-white/20 text-white/90">
              ARTIST
            </Badge>
            {artist.subscribers && (
              <Flex align="center" gap="1" className="text-xs text-white/70">
                <Users size={13} />
                <span>{artist.subscribers} subscribers</span>
              </Flex>
            )}
          </Flex>

          <Heading
            level={1}
            className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight"
          >
            {artist.name}
          </Heading>

          {artist.description && (
            <Text
              size="sm"
              className="text-white/80 line-clamp-2 max-w-xl text-xs sm:text-sm mt-1"
            >
              {artist.description}
            </Text>
          )}
        </Stack>

        <Flex align="center" gap="3" className="shrink-0 flex-wrap">
          <Button
            variant="primary"
            size="lg"
            className="rounded-full font-bold px-7 shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-all"
            leftIcon={
              isThisArtistPlaying ? (
                <Pause size={18} className="fill-current" />
              ) : (
                <Play size={18} className="fill-current ml-0.5" />
              )
            }
            onClick={() => onPlayAll(false)}
          >
            {isThisArtistPlaying ? 'Pause' : 'Play all'}
          </Button>

          <Button
            variant="glass"
            size="lg"
            className="rounded-full font-semibold px-5 hover:scale-105 active:scale-95 transition-all"
            leftIcon={<Shuffle size={18} />}
            onClick={() => onPlayAll(true)}
          >
            Shuffle
          </Button>

          {onRadio && (
            <Button
              variant="glass"
              size="lg"
              className="rounded-full font-semibold px-5 hover:scale-105 active:scale-95 transition-all"
              leftIcon={<Radio size={18} />}
              onClick={onRadio}
            >
              Radio
            </Button>
          )}

          <IconButton
            aria-label="Share artist"
            variant="glass"
            shape="circle"
            size="lg"
            className="hover:scale-105 active:scale-95 transition-all"
            icon={copied ? <Check size={19} className="text-emerald-400" /> : <Share2 size={19} />}
            onClick={handleShare}
          />
        </Flex>
      </div>
    </Box>
  );
}
