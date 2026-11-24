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
