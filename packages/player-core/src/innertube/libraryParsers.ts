import { RemotePlaylistDetails, Track, InnerTubeClientName } from '../types';
import { NetworkAdapter } from '../adapters/network';
import { INNERTUBE_CONTEXTS, INNERTUBE_PUBLIC_KEY } from './contexts';
import { parseSearchResults } from './searchParsers';
import { readResponsiveSubtitle } from './subtitleRuns';

/**
 * Parses YouTube Music browse response for 'FEmusic_liked_videos' / 'VLLM' into Track[]
 */
export function parseLikedVideos(data: any): Track[] {
  if (!data || typeof data !== 'object') return [];

  const tracks: Track[] = [];
  const seenIds = new Set<string>();

  const extractRenderer = (r: any) => {
    if (!r || typeof r !== 'object') return;
    const flexColumns = r.flexColumns || [];
    const titleRuns = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
    const title = titleRuns?.[0]?.text || '';

    let videoId: string | undefined =
      r.playlistItemData?.videoId ||
      r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
        ?.playNavigationEndpoint?.watchEndpoint?.videoId ||
      titleRuns?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

    if (!videoId && Array.isArray(r.menu?.menuRenderer?.items)) {
      for (const m of r.menu.menuRenderer.items) {
        const nav = m.menuNavigationItemRenderer?.navigationEndpoint;
        if (nav?.watchEndpoint?.videoId) {
          videoId = nav.watchEndpoint.videoId;
          break;
        }
      }
    }

    if (!videoId || !title || seenIds.has(videoId)) return;
    seenIds.add(videoId);

    const { artist, artistId, album, albumId, duration } = readResponsiveSubtitle(r, title);
    const rawThumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumbnail = rawThumbs.length > 0 ? rawThumbs[rawThumbs.length - 1].url : '';

    tracks.push({
      id: videoId,
      videoId,
      title,
      artist,
      artistId,
      album,
      albumId,
      duration,
      thumbnail,
      thumbnails: rawThumbs,
    });
  };

  const scanShelves = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const el of node) scanShelves(el);
      return;
    }
    const shelf = node.musicPlaylistShelfRenderer || node.musicShelfRenderer;
    if (shelf && Array.isArray(shelf.contents)) {
      for (const item of shelf.contents) {
        if (item?.musicResponsiveListItemRenderer) {
          extractRenderer(item.musicResponsiveListItemRenderer);
        }
      }
      return;
    }
    for (const key of Object.keys(node)) {
      scanShelves(node[key]);
    }
  };

  scanShelves(data);
  if (tracks.length > 0) return tracks;

  return parseSearchResults(data);
}

/**
 * Parses YouTube Music browse response for 'FEmusic_library_landing' into RemotePlaylistDetails[]
 */
export function parseLibraryPlaylists(data: any): RemotePlaylistDetails[] {
  const playlists: RemotePlaylistDetails[] = [];
  if (!data) return playlists;
  const seenIds = new Set<string>();

  const processItem = (item: any) => {
    // 1. musicTwoRowItemRenderer
    if (item.musicTwoRowItemRenderer) {
      const r = item.musicTwoRowItemRenderer;
      const nav = r.navigationEndpoint || r.title?.runs?.[0]?.navigationEndpoint;
      const browseId = nav?.browseEndpoint?.browseId;
      const subRuns = r.subtitle?.runs || [];
      const subtitle = subRuns.map((s: any) => s.text).join('') || r.subtitle?.simpleText || '';

      const isPlaylist =
        (browseId && (browseId.startsWith('VL') || browseId.startsWith('PL') || browseId.startsWith('RDCLAK'))) ||
        /\bplaylist\b/i.test(subtitle);

      if (isPlaylist && browseId) {
        const id = browseId.replace(/^VL/, '');
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const title = r.title?.runs?.[0]?.text || r.title?.simpleText || 'Untitled Playlist';
          const thumbs =
            r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
            r.thumbnail?.thumbnails ||
            [];
          const coverUrl = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : undefined;

          let author: string | undefined;
          let trackCount: number | undefined;

          const countMatch = subtitle.match(/(\d[\d,]*)\s*(?:songs?|tracks?)/i);
          if (countMatch) {
            trackCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
          }

          for (const s of subRuns) {
            const txt = s.text?.trim();
            if (txt && !/playlist/i.test(txt) && !/•/.test(txt) && !/^\d[\d,]*\s*(?:songs?|tracks?)$/i.test(txt)) {
              author = txt;
              break;
            }
          }

          playlists.push({
            id,
            title,
            author,
            coverUrl,
            trackCount,
            tracks: [],
          });
        }
      }
      return;
    }

    // 2. musicResponsiveListItemRenderer
    if (item.musicResponsiveListItemRenderer) {
      const r = item.musicResponsiveListItemRenderer;
      const flexColumns = r.flexColumns || [];
      const titleRuns = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
      const browseId =
        titleRuns?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
        r.navigationEndpoint?.browseEndpoint?.browseId;

      const subRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const subtitle = subRuns.map((s: any) => s.text).join('') || '';

      const isPlaylist =
        (browseId && (browseId.startsWith('VL') || browseId.startsWith('PL') || browseId.startsWith('RDCLAK'))) ||
        /\bplaylist\b/i.test(subtitle);

      if (isPlaylist && browseId) {
        const id = browseId.replace(/^VL/, '');
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const title = titleRuns?.[0]?.text || 'Untitled Playlist';
          const rawThumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const coverUrl = rawThumbs.length > 0 ? rawThumbs[rawThumbs.length - 1].url : undefined;

          let author: string | undefined;
          let trackCount: number | undefined;

          const countMatch = subtitle.match(/(\d[\d,]*)\s*(?:songs?|tracks?)/i);
          if (countMatch) {
            trackCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
          }

          for (const s of subRuns) {
            const txt = s.text?.trim();
            if (txt && !/playlist/i.test(txt) && !/•/.test(txt) && !/^\d[\d,]*\s*(?:songs?|tracks?)$/i.test(txt)) {
              author = txt;
              break;
            }
          }

          playlists.push({
            id,
            title,
            author,
            coverUrl,
            trackCount,
            tracks: [],
          });
        }
      }
      return;
    }
  };

  const walkNodes = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const el of node) walkNodes(el);
      return;
    }
    processItem(node);
    for (const key of Object.keys(node)) {
      if (key === 'musicTwoRowItemRenderer' || key === 'musicResponsiveListItemRenderer') continue;
      walkNodes(node[key]);
    }
  };

  walkNodes(data);
  return playlists;
}

export async function requestAuthenticatedBrowse(
  network: NetworkAdapter,
  baseUrl: string,
  browseId: string,
  params?: string,
  clientName: InnerTubeClientName = 'WEB_REMIX'
): Promise<any> {
  const context = INNERTUBE_CONTEXTS[clientName];
  const endpoint = `/youtubei/v1/browse?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;
  const fullUrl = `${baseUrl}${endpoint}`;

  const payload: Record<string, any> = { context, browseId };
  if (params) payload.params = params;

  if (typeof network.fetchAuthenticated === 'function') {
    try {
      return await network.fetchAuthenticated(endpoint, payload);
    } catch {
      // Fall back to standard network adapter
    }
  }

  return network.postJson<any>(fullUrl, payload, {
    'Content-Type': 'text/plain',
    'X-YouTube-Client-Name': context.client.clientName,
    'X-YouTube-Client-Version': context.client.clientVersion,
  });
}

export async function requestLikeStatus(
  network: NetworkAdapter,
  baseUrl: string,
  videoId: string,
  status: 'LIKE' | 'INDIFFERENT',
  clientName: InnerTubeClientName = 'WEB_REMIX'
): Promise<boolean> {
  const path = status === 'LIKE' ? '/youtubei/v1/like/like' : '/youtubei/v1/like/removelike';
  const endpoint = `${path}?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;
  const fullUrl = `${baseUrl}${endpoint}`;
  const context = INNERTUBE_CONTEXTS[clientName];
  const payload = { context, target: { videoId } };

  try {
    if (typeof network.fetchAuthenticated === 'function') {
      try {
        await network.fetchAuthenticated(endpoint, payload);
        return true;
      } catch {
        // Fall back to postJson
      }
    }

    await network.postJson(fullUrl, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });
    return true;
  } catch {
    return false;
  }
}
