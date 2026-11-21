import { MediaShelfData, ShelfItemData, Track } from '../types';

export interface SyntheticShelfOptions {
  history?: Track[];
  likedTracks?: Track[];
  fallbackSeedTracks?: Track[];
  enableSynthetic?: boolean;
}

function hasMatchingShelf(shelves: MediaShelfData[], pattern: RegExp): boolean {
  return shelves.some((shelf) => pattern.test(shelf.title));
}

function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const result: Track[] = [];
  for (const t of tracks) {
    const vid = t.videoId || t.id;
    if (vid && !seen.has(vid)) {
      seen.add(vid);
      result.push(t);
    }
  }
  return result;
}

/**
 * Generate synthetic personalized and contextual shelves when not provided by InnerTube
 * (e.g. anonymous or unauthenticated sessions without YouTube cookies).
 * Ensures "Listen Again", "Song Mixes", "Trending Songs for you", and "Covers and remixes" appear.
 */
export function generateSyntheticShelves(
  existingShelves: MediaShelfData[],
  options: SyntheticShelfOptions = {}
): MediaShelfData[] {
  const shelves = [...existingShelves];

  const history = dedupeTracks(options.history || []);
  const likes = dedupeTracks(options.likedTracks || []);
  const fallbacks = dedupeTracks(options.fallbackSeedTracks || []);

  const userTracks = history.length > 0 ? history : likes;
  const pool = userTracks.length > 0 ? userTracks : fallbacks;

  // 1. "Listen Again" shelf
  const existingListenAgainIdx = shelves.findIndex((s) => /listen\s*again/i.test(s.title));
  if (userTracks.length > 0) {
    const items: ShelfItemData[] = userTracks.slice(0, 10).map((t) => ({
      id: t.videoId || t.id,
      type: 'song',
      title: t.title,
      subtitle: t.artist,
      thumbnail: t.thumbnail,
      videoId: t.videoId || t.id,
    }));

    if (items.length > 0) {
      if (existingListenAgainIdx !== -1) {
        if (shelves[existingListenAgainIdx].id === 'synthetic_listen_again') {
          shelves[existingListenAgainIdx] = {
            ...shelves[existingListenAgainIdx],
            items,
          };
        }
      } else {
        shelves.unshift({
          id: 'synthetic_listen_again',
          title: 'Listen Again',
          subtitle: 'From your recent listening',
          items,
        });
      }
    }
  }

  // 2. "Song Mixes" shelf
  const existingMixesIdx = shelves.findIndex((s) =>
    /song\s*mixes|mixed\s*for\s*you/i.test(s.title)
  );
  if (pool.length > 0) {
    const seedPool = pool.slice(0, 8);
    const items: ShelfItemData[] = seedPool.map((t) => ({
      id: `mix_${t.videoId}`,
      type: 'playlist',
      title: `${t.title} Mix`,
      subtitle: `Mix • ${t.artist}`,
      thumbnail: t.thumbnail,
      videoId: t.videoId,
      browseId: `RDAMVM${t.videoId}`,
    }));

    if (items.length > 0) {
      if (existingMixesIdx !== -1) {
        if (shelves[existingMixesIdx].id === 'synthetic_song_mixes') {
          shelves[existingMixesIdx] = {
            ...shelves[existingMixesIdx],
            items,
          };
        }
      } else {
        const insertIdx = shelves.findIndex((s) => /listen\s*again/i.test(s.title));
        const targetIdx = insertIdx !== -1 ? insertIdx + 1 : 0;
        shelves.splice(targetIdx, 0, {
          id: 'synthetic_song_mixes',
          title: 'Song Mixes',
          subtitle: 'Endless personalized radio from songs you love',
          items,
        });
      }
    }
  }

  // 3. "Trending Songs for you" shelf
  if (!hasMatchingShelf(shelves, /trending\s*songs\s*for\s*you|trending\s*for\s*you/i)) {
    const trendingPool = (fallbacks.length > 0 ? fallbacks : pool).slice(0, 10);
    if (trendingPool.length > 0) {
      const items: ShelfItemData[] = trendingPool.map((t) => ({
        id: `trending_${t.videoId}`,
        type: 'song',
        title: t.title,
        subtitle: t.artist,
        thumbnail: t.thumbnail,
        videoId: t.videoId,
      }));

      shelves.push({
        id: 'synthetic_trending_for_you',
        title: 'Trending Songs for you',
        subtitle: 'Popular tracks aligned with your taste',
        items,
      });
    }
  }

  // 4. "Covers and remixes" shelf
  if (!hasMatchingShelf(shelves, /covers\s*and\s*remixes/i)) {
    const remixCandidates = pool.filter(
      (t) =>
        /remix|cover|acoustic|live|version|edit/i.test(t.title) ||
        /remix|cover|acoustic|live/i.test(t.artist)
    );

    const sourceTracks = remixCandidates.length >= 3 ? remixCandidates : pool.slice(0, 6);
    if (sourceTracks.length > 0) {
      const items: ShelfItemData[] = sourceTracks.map((t) => {
        const isRemix = /remix|cover|acoustic/i.test(t.title);
        return {
          id: `cr_${t.videoId}`,
          type: 'song',
          title: isRemix ? t.title : `${t.title} (Acoustic & Remix Radio)`,
          subtitle: `${t.artist} • Reimagined`,
          thumbnail: t.thumbnail,
          videoId: t.videoId,
          browseId: `RDAMVM${t.videoId}`,
        };
      });

      shelves.push({
        id: 'synthetic_covers_and_remixes',
        title: 'Covers and remixes',
        subtitle: 'New takes on familiar favorites',
        items,
      });
    }
  }

  return shelves;
}
