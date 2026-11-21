import { ShelfItemData } from '../types';

export function parseShelfItem(item: any): ShelfItemData | null {
  if (!item || typeof item !== 'object') return null;

  // 1. musicTwoRowItemRenderer
  if (item.musicTwoRowItemRenderer) {
    const r = item.musicTwoRowItemRenderer;
    const title = r.title?.runs?.[0]?.text || r.title?.simpleText || '';
    const subRuns = r.subtitle?.runs;
    const subtitle = subRuns ? subRuns.map((s: any) => s.text).join('') : r.subtitle?.simpleText || '';

    const thumbs =
      r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      r.thumbnail?.thumbnails ||
      [];
    const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';

    const nav = r.navigationEndpoint || r.title?.runs?.[0]?.navigationEndpoint;
    const videoId = nav?.watchEndpoint?.videoId;
    const playlistId = nav?.watchEndpoint?.playlistId || nav?.watchPlaylistEndpoint?.playlistId;
    const browseId =
      nav?.browseEndpoint?.browseId ||
      (playlistId
        ? playlistId.startsWith('VL') || playlistId.startsWith('RD') || playlistId.startsWith('PL')
          ? playlistId
          : 'VL' + playlistId
        : undefined);

    let type: 'song' | 'album' | 'playlist' | 'artist' = 'song';
    if (browseId) {
      if (browseId.startsWith('MPREb_') || browseId.startsWith('FEmusic_library_corpus_track')) {
        type = 'album';
      } else if (
        browseId.startsWith('VL') ||
        browseId.startsWith('RDCLAK') ||
        browseId.startsWith('PL') ||
        browseId.startsWith('RD')
      ) {
        type = 'playlist';
      } else if (browseId.startsWith('UC') || browseId.startsWith('FEmusic_library_corpus_artists')) {
        type = 'artist';
      } else if (/\balbum\b/i.test(subtitle) || /\bsingle\b/i.test(subtitle) || /\bep\b/i.test(subtitle)) {
        type = 'album';
      } else if (/\bplaylist\b/i.test(subtitle) || /\bmix\b/i.test(subtitle)) {
        type = 'playlist';
      } else if (/\bartist\b/i.test(subtitle)) {
        type = 'artist';
      } else {
        type = videoId ? 'song' : 'album';
      }
    } else if (videoId) {
      type = 'song';
    } else if (/\bartist\b/i.test(subtitle)) {
      type = 'artist';
    } else if (/\bplaylist\b/i.test(subtitle) || /\bmix\b/i.test(subtitle)) {
      type = 'playlist';
    } else if (/\balbum\b/i.test(subtitle)) {
      type = 'album';
    }

    const id = videoId || browseId || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `item_${Math.random().toString(36).substring(2, 7)}`);

    if (title) {
      return {
        id,
        type,
        title,
        subtitle,
        thumbnail,
        videoId,
        browseId,
      };
    }
  }

  // 2. musicResponsiveListItemRenderer
  if (item.musicResponsiveListItemRenderer) {
    const r = item.musicResponsiveListItemRenderer;
    const flexColumns = r.flexColumns || [];

    let videoId: string | undefined =
      r.playlistItemData?.videoId ||
      r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;

    let title = '';
    const titleRuns = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
    if (titleRuns && titleRuns.length > 0) {
      title = titleRuns[0].text;
      if (!videoId && titleRuns[0].navigationEndpoint?.watchEndpoint?.videoId) {
        videoId = titleRuns[0].navigationEndpoint.watchEndpoint.videoId;
      }
    }

    let subtitle = '';
    const subRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
    if (subRuns && subRuns.length > 0) {
      subtitle = subRuns.map((s: any) => s.text).join('');
    }

    const playlistId =
      r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.playlistId ||
      r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchPlaylistEndpoint?.playlistId ||
      titleRuns?.[0]?.navigationEndpoint?.watchEndpoint?.playlistId ||
      titleRuns?.[0]?.navigationEndpoint?.watchPlaylistEndpoint?.playlistId;

    const browseId =
      titleRuns?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      subRuns?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      (playlistId
        ? playlistId.startsWith('VL') || playlistId.startsWith('RD') || playlistId.startsWith('PL')
          ? playlistId
          : 'VL' + playlistId
        : undefined);

    const rawThumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumbnail = rawThumbs.length > 0 ? rawThumbs[rawThumbs.length - 1].url : '';

    let type: 'song' | 'album' | 'playlist' | 'artist' = 'song';
    if (
      browseId?.startsWith('VL') ||
      browseId?.startsWith('PL') ||
      browseId?.startsWith('RD') ||
      /\bplaylist\b/i.test(subtitle) ||
      /\bmix\b/i.test(subtitle)
    ) {
      type = 'playlist';
    } else if (videoId) {
      type = 'song';
    } else if (browseId?.startsWith('UC') || /\bartist\b/i.test(subtitle)) {
      type = 'artist';
    } else if (browseId?.startsWith('MPREb_') || /\balbum\b/i.test(subtitle) || /\bsingle\b/i.test(subtitle)) {
      type = 'album';
    }

    const id = videoId || browseId || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `item_${Math.random().toString(36).substring(2, 7)}`);

    if (title) {
      return {
        id,
        type,
        title,
        subtitle,
        thumbnail,
        videoId,
        browseId,
      };
    }
  }

  // 3. compactVideoRenderer / videoRenderer
  const vr = item.videoRenderer || item.compactVideoRenderer;
  if (vr) {
    const videoId = vr.videoId;
    const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || '';
    const subtitle = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || '';
    const thumbs = vr.thumbnail?.thumbnails || [];
    const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';
    const id = videoId || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (title) {
      return {
        id,
        type: 'song',
        title,
        subtitle,
        thumbnail,
        videoId,
      };
    }
  }

  return null;
}
