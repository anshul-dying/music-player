import { type RelatedItem } from '@mp/dying';
import { type Track } from '@mp/player-core';

export function handleRelatedSelection(
  item: RelatedItem,
  playTrack: (track: Track) => Promise<void>,
  navigate: (route: string) => void
) {
  if (item.videoId) {
    playTrack({
      id: item.videoId,
      videoId: item.videoId,
      title: item.title,
      artist: item.subtitle || 'YouTube Music',
      duration: 0,
      thumbnail: item.thumbnailUrl || item.thumbnail || '',
    });
    return;
  }

  if (item.browseId) {
    const route =
      item.type === 'artist'
        ? `/artist/${item.browseId}`
        : item.type === 'album'
        ? `/album/${item.browseId}`
        : `/playlist/${item.browseId.replace(/^VL/, '')}`;
    navigate(route);
  }
}

export interface SaveQueueParams {
  queue: Track[];
  currentTrack: Track | null;
  createPlaylist: (name: string) => Promise<{ id: string; name: string } | null>;
  addTracksToPlaylist: (playlistId: string, tracks: Track[]) => Promise<boolean>;
  toast: (opts: {
    title: string;
    description?: string;
    variant?: 'default' | 'success' | 'warning' | 'error';
  }) => void;
}

export async function handleSaveQueueAsPlaylist({
  queue,
  currentTrack,
  createPlaylist,
  addTracksToPlaylist,
  toast,
}: SaveQueueParams): Promise<void> {
  if (queue.length === 0) {
    toast({
      title: 'Queue is empty',
      description: 'Add tracks to your queue before saving as a playlist.',
      variant: 'warning',
    });
    return;
  }

  const playlistName = currentTrack
    ? `${currentTrack.title} Radio`
    : `Saved Queue (${new Date().toLocaleDateString()})`;

  const created = await createPlaylist(playlistName);
  if (!created) {
    toast({
      title: 'Failed to save queue',
      description: 'Could not create playlist.',
      variant: 'error',
    });
    return;
  }

  const added = await addTracksToPlaylist(created.id, queue);
  if (!added) {
    toast({
      title: 'Failed to save queue',
      description: `Created "${created.name}" but could not add tracks.`,
      variant: 'error',
    });
    return;
  }

  toast({
    title: 'Queue saved to playlist',
    description: `Added ${queue.length} ${queue.length === 1 ? 'track' : 'tracks'} to "${created.name}".`,
    variant: 'success',
  });
}
