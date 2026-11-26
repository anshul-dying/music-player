import { CategorizedSearchResults, ShelfItemData, Track } from '../types';
import { parseSearchResults } from './searchParsers';

function joinRuns(runs: any[] | undefined): string {
  if (!Array.isArray(runs)) return '';
  return runs.map((r) => r?.text || '').join('').trim();
}

function lastThumbUrl(thumbs: any[] | undefined): string {
  if (!Array.isArray(thumbs) || thumbs.length === 0) return '';
  return thumbs[thumbs.length - 1]?.url || '';
}

function classifyBrowseItem(
  browseId: string,
  pageType: string | undefined,
  shelfTitle: string
): 'artist' | 'album' | 'playlist' | null {
  const lowerShelf = shelfTitle.toLowerCase();
  if (pageType === 'MUSIC_PAGE_TYPE_ARTIST' || browseId.startsWith('UC') || lowerShelf.includes('artist')) {
    return 'artist';
  }
  if (pageType === 'MUSIC_PAGE_TYPE_ALBUM' || browseId.startsWith('MPREb_') || lowerShelf.includes('album')) {
    return 'album';
  }
  if (
    pageType === 'MUSIC_PAGE_TYPE_PLAYLIST' ||
    browseId.startsWith('VL') ||
    browseId.startsWith('PL') ||
    lowerShelf.includes('playlist')
  ) {
    return 'playlist';
  }
  return null;
}

function pushUniqueShelfItem(target: ShelfItemData[], seen: Set<string>, item: ShelfItemData): void {
  if (!item.id || seen.has(item.id)) return;
  seen.add(item.id);
  target.push(item);
}

/**
 * Extracts categorized Songs, Artists, Albums, and Playlists from InnerTube search responses.
 */
export function parseCategorizedSearchResults(data: any): CategorizedSearchResults {
  const songs: Track[] = [];
  const artists: ShelfItemData[] = [];
  const albums: ShelfItemData[] = [];
  const playlists: ShelfItemData[] = [];
  if (!data) return { songs, artists, albums, playlists };

  const seenSongs = new Set<string>();
  const seenArtists = new Set<string>();
  const seenAlbums = new Set<string>();
  const seenPlaylists = new Set<string>();

  const addSongsFromNode = (node: any) => {
    for (const track of parseSearchResults(node)) {
      if (!track.videoId || seenSongs.has(track.videoId)) continue;
      seenSongs.add(track.videoId);
      songs.push(track);
    }
  };

  const processResponsiveItem = (renderer: any, shelfTitle: string) => {
    if (!renderer) return;
    const flexCols = renderer.flexColumns || [];
    const titleRuns = flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
    const title = joinRuns(titleRuns);
    const subtitle = joinRuns(flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs);
    const thumbnail = lastThumbUrl(renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails);

    const browseEndpoint =
      renderer.navigationEndpoint?.browseEndpoint ||
      titleRuns?.[0]?.navigationEndpoint?.browseEndpoint;
    const browseId: string | undefined = browseEndpoint?.browseId;
    const pageType: string | undefined =
      browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;

    if (browseId && title) {
      const kind = classifyBrowseItem(browseId, pageType, shelfTitle);
      if (kind === 'artist') {
        pushUniqueShelfItem(artists, seenArtists, { id: browseId, type: 'artist', title, subtitle, thumbnail, browseId });
        return;
      }
      if (kind === 'album') {
        pushUniqueShelfItem(albums, seenAlbums, { id: browseId, type: 'album', title, subtitle, thumbnail, browseId });
        return;
      }
      if (kind === 'playlist') {
        pushUniqueShelfItem(playlists, seenPlaylists, { id: browseId, type: 'playlist', title, subtitle, thumbnail, browseId });
        return;
      }
    }

    addSongsFromNode({ musicResponsiveListItemRenderer: renderer });
  };

  const processTopCard = (card: any) => {
    if (!card) return;
    const title = joinRuns(card.title?.runs);
    const subtitle = joinRuns(card.subtitle?.runs);
    const thumbnail = lastThumbUrl(card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails);
    const endpoint = card.onTap || card.title?.runs?.[0]?.navigationEndpoint;
    const browseId: string | undefined = endpoint?.browseEndpoint?.browseId;
    const pageType: string | undefined =
      endpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;

    if (browseId && title) {
      const kind = classifyBrowseItem(browseId, pageType, '');
      if (kind === 'artist') {
        pushUniqueShelfItem(artists, seenArtists, { id: browseId, type: 'artist', title, subtitle, thumbnail, browseId });
      } else if (kind === 'album') {
        pushUniqueShelfItem(albums, seenAlbums, { id: browseId, type: 'album', title, subtitle, thumbnail, browseId });
      } else if (kind === 'playlist') {
        pushUniqueShelfItem(playlists, seenPlaylists, { id: browseId, type: 'playlist', title, subtitle, thumbnail, browseId });
      }
      return;
    }

    const videoId: string | undefined = endpoint?.watchEndpoint?.videoId;
    if (videoId && title && !seenSongs.has(videoId)) {
      seenSongs.add(videoId);
      songs.push({ id: videoId, videoId, title, artist: subtitle || 'YouTube Music', duration: 0, thumbnail });
    }
  };

  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.musicCardShelfRenderer) {
      processTopCard(node.musicCardShelfRenderer);
    }
    if (node.musicShelfRenderer) {
      const shelf = node.musicShelfRenderer;
      const shelfTitle = joinRuns(shelf.title?.runs);
      const contents = shelf.contents || [];
      for (const entry of contents) {
        if (entry?.musicResponsiveListItemRenderer) {
          processResponsiveItem(entry.musicResponsiveListItemRenderer, shelfTitle);
        } else {
          addSongsFromNode(entry);
        }
      }
      return;
    }
    for (const key of Object.keys(node)) {
      walk(node[key]);
    }
  };

  walk(data);
  if (songs.length === 0) addSongsFromNode(data);

  return { songs, artists, albums, playlists };
}
