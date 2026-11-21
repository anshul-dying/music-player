import {
  HomeFeedData,
  MediaShelfData,
  MoodChipData,
  ShelfItemData,
  Track,
} from '../types';
import { parseTrackFromRenderer } from './parsers';
import { parseShelfItem } from './shelfParsers';
import { parseSearchResults } from './searchParsers';
import { generateSyntheticShelves, type SyntheticShelfOptions } from './syntheticShelves';

export { parseNextRadio } from './nextRadioParsers';
export { generateSyntheticShelves, type SyntheticShelfOptions } from './syntheticShelves';

/**
 * Parse YouTube Music Home feed browse response into chips, quick picks, and shelves
 */
export function parseHomeFeed(data: any, options?: SyntheticShelfOptions): HomeFeedData {
  if (!data || typeof data !== 'object') {
    const fallbackShelves = options ? generateSyntheticShelves([], options) : [];
    return { chips: [], quickPicks: [], shelves: fallbackShelves };
  }

  // 1. Parse mood chips
  const chips: MoodChipData[] = [];
  const seenChipIds = new Set<string>();

  const extractChips = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.chipCloudChipRenderer) {
      const c = node.chipCloudChipRenderer;
      const title = c.text?.runs?.[0]?.text || c.text?.simpleText || '';
      const params = c.navigationEndpoint?.browseEndpoint?.params || undefined;
      const isActive = Boolean(c.isSelected);
      const id = c.uniqueId || params || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (title && !seenChipIds.has(id)) {
        seenChipIds.add(id);
        chips.push({ id, title, params, isActive });
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) extractChips(item);
      return;
    }
    for (const key of Object.keys(node)) {
      extractChips(node[key]);
    }
  };
  extractChips(data);

  // 2. Parse shelves and quick picks
  const shelves: MediaShelfData[] = [];
  let quickPicks: Track[] = [];

  const processShelf = (shelfNode: any) => {
    const header =
      shelfNode.header?.musicCarouselShelfBasicHeaderRenderer ||
      shelfNode.header?.musicHeaderRenderer ||
      shelfNode.header?.gridHeaderRenderer ||
      shelfNode.header?.musicCardShelfHeaderBasicRenderer ||
      shelfNode.header;

    const title =
      header?.title?.runs?.map((r: any) => r.text).join('') ||
      header?.title?.simpleText ||
      shelfNode.title?.runs?.map((r: any) => r.text).join('') ||
      shelfNode.title?.simpleText ||
      '';

    const subtitle =
      header?.strapline?.runs?.map((r: any) => r.text).join('') ||
      header?.strapline?.simpleText ||
      header?.subtitle?.runs?.map((r: any) => r.text).join('') ||
      header?.subtitle?.simpleText ||
      shelfNode.strapline?.runs?.map((r: any) => r.text).join('') ||
      shelfNode.subtitle?.runs?.map((r: any) => r.text).join('') ||
      undefined;

    const rawItems = shelfNode.contents || shelfNode.items || [];
    const shelfItems: ShelfItemData[] = [];
    const shelfTracks: Track[] = [];

    for (const item of rawItems) {
      const shelfItem = parseShelfItem(item);
      if (shelfItem) {
        shelfItems.push(shelfItem);
      }
      const track = parseTrackFromRenderer(item);
      if (track) {
        shelfTracks.push(track);
      }
    }

    if (shelfItems.length > 0 || title) {
      const id =
        shelfNode.id ||
        (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `shelf_${shelves.length + 1}`);

      shelves.push({
        id,
        title,
        subtitle,
        items: shelfItems,
      });

      const isQuickPickShelf =
        /quick\s*pick/i.test(title) ||
        /listen\s*again/i.test(title) ||
        /mixed\s*for\s*you/i.test(title) ||
        /start\s*radio/i.test(title);

      if (isQuickPickShelf && quickPicks.length === 0 && shelfTracks.length > 0) {
        quickPicks = shelfTracks;
      }
    }
  };

  const findShelves = (node: any) => {
    if (!node || typeof node !== 'object') return;

    if (node.musicCarouselShelfRenderer) {
      processShelf(node.musicCarouselShelfRenderer);
      return;
    }
    if (node.musicImmersiveCarouselShelfRenderer) {
      processShelf(node.musicImmersiveCarouselShelfRenderer);
      return;
    }
    if (node.musicShelfRenderer) {
      processShelf(node.musicShelfRenderer);
      return;
    }
    if (node.musicCardShelfRenderer) {
      processShelf(node.musicCardShelfRenderer);
      return;
    }
    if (node.gridRenderer) {
      processShelf(node.gridRenderer);
      return;
    }

    if (Array.isArray(node)) {
      for (const child of node) findShelves(child);
      return;
    }

    for (const key of Object.keys(node)) {
      if (key === 'chipCloudRenderer') continue;
      findShelves(node[key]);
    }
  };
  findShelves(data);

  // Fallback: if no explicitly titled quick pick shelf was matched, take first shelf with song tracks
  if (quickPicks.length === 0) {
    for (const shelf of shelves) {
      const songItems = shelf.items.filter((item) => item.type === 'song' && item.videoId);
      if (songItems.length > 0) {
        quickPicks = songItems.map((item) => ({
          id: item.videoId!,
          videoId: item.videoId!,
          title: item.title,
          artist: item.subtitle.split('•')[0].trim() || 'Unknown Artist',
          duration: 0,
          thumbnail: item.thumbnail,
        }));
        break;
      }
    }
  }

  // Secondary fallback: parse all tracks from response if still empty
  if (quickPicks.length === 0) {
    quickPicks = parseSearchResults(data);
  }

  // 3. Enrich with synthetic personalized and contextual shelves if options are provided
  const shouldEnrich =
    Boolean(options?.enableSynthetic) ||
    Boolean(options?.history?.length) ||
    Boolean(options?.likedTracks?.length);

  const enrichedShelves = shouldEnrich
    ? generateSyntheticShelves(shelves, {
        ...options,
        fallbackSeedTracks: quickPicks,
      })
    : shelves;

  return {
    chips,
    quickPicks,
    shelves: enrichedShelves,
  };
}
