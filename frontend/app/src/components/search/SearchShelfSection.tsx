'use client';

import React from 'react';
import { MediaShelf, MediaCard, Box } from '@mp/dying';
import { type ShelfItemData } from '@mp/player-core';

export interface SearchShelfSectionProps {
  title: string;
  items: ShelfItemData[];
  onNavigate: (path: string) => void;
}

export function SearchShelfSection({ title, items, onNavigate }: SearchShelfSectionProps) {
  if (!items || items.length === 0) return null;

  const handleOpen = (item: ShelfItemData) => {
    if (!item.browseId) return;
    if (item.type === 'artist' || item.browseId.startsWith('UC')) {
      onNavigate(`/artist/${item.browseId}`);
    } else if (item.type === 'album' || item.browseId.startsWith('MPREb_')) {
      onNavigate(`/album/${item.browseId}`);
    } else {
      onNavigate(`/playlist/${item.browseId}`);
    }
  };

  return (
    <Box className="space-y-4">
      <MediaShelf title={title}>
        {items.map((item) => (
          <MediaCard
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            imageUrl={item.thumbnail}
            aspect="square"
            onPlay={() => handleOpen(item)}
            onClick={() => handleOpen(item)}
          />
        ))}
      </MediaShelf>
    </Box>
  );
}
