import { NextRadioData, ShelfItemData, Track } from '../types';
import { parseTrackFromRenderer } from './parsers';
import { parseShelfItem } from './shelfParsers';
import { parseSearchResults } from './searchParsers';

/**
 * Parse YouTube Music Next response into Up Next queue and Related shelves
 */
export function parseNextRadio(data: any): NextRadioData {
  if (!data || typeof data !== 'object') {
    return { queue: [], related: [] };
  }

  const queue: Track[] = [];
  const seenQueueIds = new Set<string>();

  const related: ShelfItemData[] = [];
  const seenRelatedIds = new Set<string>();

  // 1. Extract queue items from playlistPanelVideoRenderer
  const findQueue = (node: any) => {
    if (!node || typeof node !== 'object') return;

    if (node.playlistPanelVideoRenderer) {
      const track = parseTrackFromRenderer(node);
      if (track && !seenQueueIds.has(track.videoId)) {
        seenQueueIds.add(track.videoId);
        queue.push(track);
      }
      return;
    }

    if (node.playlistPanelVideoWrapperRenderer) {
      const primary = node.playlistPanelVideoWrapperRenderer.primaryRenderer;
      if (primary) findQueue(primary);
      return;
    }

    if (Array.isArray(node)) {
      for (const child of node) findQueue(child);
      return;
    }

    for (const key of Object.keys(node)) {
      findQueue(node[key]);
    }
  };

  const tabs =
    data.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer
      ?.watchNextTabbedResultsRenderer?.tabs;

  if (Array.isArray(tabs) && tabs.length > 0) {
    findQueue(tabs[0]);
  } else {
    findQueue(data);
  }

  // 2. Extract related items from Related tab or shelves in response
  const processRelatedItem = (itemNode: any) => {
    const item = parseShelfItem(itemNode);
    if (item && !seenRelatedIds.has(item.id)) {
      seenRelatedIds.add(item.id);
      related.push(item);
    }
  };

  const findRelated = (node: any) => {
    if (!node || typeof node !== 'object') return;

    if (node.musicTwoRowItemRenderer || node.musicResponsiveListItemRenderer) {
      processRelatedItem(node);
      return;
    }

    if (Array.isArray(node)) {
      for (const child of node) findRelated(child);
      return;
    }

    for (const key of Object.keys(node)) {
      if (key === 'playlistPanelRenderer' || key === 'musicQueueRenderer') {
        continue;
      }
      findRelated(node[key]);
    }
  };

  if (Array.isArray(tabs)) {
    const relatedTab =
      tabs.find((t: any) => {
        const title =
          t.tabRenderer?.title?.runs?.[0]?.text ||
          t.tabRenderer?.title?.simpleText ||
          t.tabRenderer?.title;
        return typeof title === 'string' && /related/i.test(title);
      }) || tabs[2];

    if (relatedTab) {
      findRelated(relatedTab);
    } else {
      findRelated(data);
    }
  } else {
    findRelated(data);
  }

  // Fallback: if queue is empty, try parseSearchResults
  if (queue.length === 0) {
    const fallbackTracks = parseSearchResults(data);
    for (const t of fallbackTracks) {
      if (!seenQueueIds.has(t.videoId)) {
        seenQueueIds.add(t.videoId);
        queue.push(t);
      }
    }
  }

  return { queue, related };
}
