import { NextRadioData, QueueFilterChip, ShelfItemData, Track } from '../types';
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

  let relatedBrowseId: string | undefined;

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
      relatedBrowseId = relatedTab.tabRenderer?.endpoint?.browseEndpoint?.browseId;
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

  // 3. Extract Up Next automix filter chips from subHeaderChipCloud
  const chips: QueueFilterChip[] = [];
  const findChips = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.chipCloudRenderer?.chips && Array.isArray(node.chipCloudRenderer.chips)) {
      for (const entry of node.chipCloudRenderer.chips) {
        const chip = entry?.chipCloudChipRenderer;
        if (!chip) continue;
        const label =
          chip.text?.runs?.map((r: any) => r?.text || '').join('').trim() ||
          chip.text?.simpleText ||
          '';
        const watchEp =
          chip.navigationEndpoint?.queueUpdateCommand?.fetchContentsCommand?.watchEndpoint ||
          chip.navigationEndpoint?.watchEndpoint;
        if (label) {
          chips.push({
            label,
            ...(watchEp?.params ? { params: watchEp.params } : {}),
            ...(watchEp?.playlistId ? { playlistId: watchEp.playlistId } : {}),
          });
        }
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) findChips(child);
      return;
    }
    for (const key of Object.keys(node)) {
      findChips(node[key]);
    }
  };
  findChips(Array.isArray(tabs) && tabs.length > 0 ? tabs[0] : data);

  return {
    queue,
    related,
    ...(relatedBrowseId ? { relatedBrowseId } : {}),
    ...(chips.length > 0 ? { chips } : {}),
  };
}

/**
 * Parse a lazy-loaded Related tab browse response into ShelfItemData[]
 */
export function parseRelatedBrowse(data: any): ShelfItemData[] {
  const related: ShelfItemData[] = [];
  const seenIds = new Set<string>();
  if (!data || typeof data !== 'object') return related;

  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.musicTwoRowItemRenderer || node.musicResponsiveListItemRenderer) {
      const item = parseShelfItem(node);
      if (item && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        related.push(item);
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    for (const key of Object.keys(node)) {
      walk(node[key]);
    }
  };

  walk(data);
  return related;
}
