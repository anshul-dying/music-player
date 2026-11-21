'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, MediaShelf, MediaCard } from '@mp/dying';
import { type MediaShelfData } from '@mp/player-core';
import { type Track } from '../../stores/playerStore';

export interface HomeShelvesProps {
  shelves: MediaShelfData[];
  onPlayTrack: (track: Track) => void;
}

export function HomeShelves({ shelves, onPlayTrack }: HomeShelvesProps) {
  const router = useRouter();

  const handleNavigateOrPlay = (item: any) => {
    if (item.browseId) {
      if (item.browseId.startsWith('UC')) {
        router.push(`/artist/${item.browseId}`);
      } else if (item.browseId.startsWith('MPREb_')) {
        router.push(`/album/${item.browseId}`);
      } else if (
        item.browseId.startsWith('VL') ||
        item.browseId.startsWith('PL') ||
        item.browseId.startsWith('RD')
      ) {
        router.push(`/playlist/${item.browseId}`);
      }
    } else if (item.videoId) {
      const trackItem: Track = {
        id: item.videoId,
        videoId: item.videoId,
        title: item.title,
        artist: item.subtitle || '',
        duration: 0,
        thumbnail: item.thumbnail || item.imageUrl,
      };
      onPlayTrack(trackItem);
    }
  };

  return (
    <>
      {shelves.map((shelf) => {
        if (!shelf.items || shelf.items.length === 0) return null;
        return (
          <Box key={shelf.id} className="space-y-4">
            <MediaShelf title={shelf.title}>
              {shelf.items.map((item: any) => (
                <MediaCard
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  imageUrl={item.thumbnail || item.imageUrl}
                  aspect="square"
                  onPlay={() => {
                    if (item.type === 'song' && item.videoId) {
                      const trackItem: Track = {
                        id: item.videoId,
                        videoId: item.videoId,
                        title: item.title,
                        artist: item.subtitle || '',
                        duration: 0,
                        thumbnail: item.thumbnail || (item as any).imageUrl,
                      };
                      onPlayTrack(trackItem);
                    } else if (item.browseId) {
                      handleNavigateOrPlay(item);
                    } else if (item.videoId) {
                      const trackItem: Track = {
                        id: item.videoId,
                        videoId: item.videoId,
                        title: item.title,
                        artist: item.subtitle || '',
                        duration: 0,
                        thumbnail: item.thumbnail || (item as any).imageUrl,
                      };
                      onPlayTrack(trackItem);
                    }
                  }}
                  onClick={() => handleNavigateOrPlay(item)}
                />
              ))}
            </MediaShelf>
          </Box>
        );
      })}
    </>
  );
}
