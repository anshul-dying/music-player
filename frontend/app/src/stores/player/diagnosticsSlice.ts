import {
  PlayerEngine,
  Track,
  InnerTubeClientName,
  ClientVerdict,
  HomeFeedData,
  NextRadioData,
  ArtistDetails,
  AlbumDetails,
  RemotePlaylistDetails,
  SyntheticShelfOptions,
} from '@mp/player-core';
import {
  type StoreSet,
  type StoreGet,
  type NetworkAdapterType,
  type StreamingStatus,
  type DiagnosticInfo,
} from './types';
import {
  getSharedEngine,
  setSharedEngine,
  createNetworkAdapter,
  ITAG_METADATA,
} from './engineContext';

export const createDiagnosticsSlice = (set: StoreSet, get: StoreGet) => ({
  activeClient: null as InnerTubeClientName | null,
  activeItag: 251,
  codec: 'Opus 48kHz (itag 251)',
  bitrate: 160000,
  sampleRate: 48000,
  bufferedAheadSeconds: 0,
  bufferedPercent: 0,
  networkAdapterType: 'dev-proxy' as NetworkAdapterType,
  streamingStatus: 'Edge Fallback Proxy' as StreamingStatus,
  verdicts: [] as ClientVerdict[],

  setNetworkAdapterType: (type: NetworkAdapterType) => {
    const engine = get().engine;
    if (engine) {
      const newAdapter = createNetworkAdapter(type);
      engine.setNetworkAdapter(newAdapter);
    }
    set({
      networkAdapterType: type,
      streamingStatus: type === 'web-extension' ? 'Direct CDN via Extension' : 'Edge Fallback Proxy',
    });
  },

  getDiagnosticInfo: (): DiagnosticInfo => {
    const s = get();
    const isDirect = s.networkAdapterType === 'web-extension';
    const streamingStatus: StreamingStatus = isDirect
      ? 'Direct CDN via Extension'
      : 'Edge Fallback Proxy';

    let bitrate = s.bitrate ?? (s.activeItag ? ITAG_METADATA[s.activeItag]?.bitrate ?? null : null);
    let sampleRate = s.sampleRate ?? (s.activeItag ? ITAG_METADATA[s.activeItag]?.sampleRate ?? null : null);
    let codec = s.codec;

    const engine = s.engine || getSharedEngine();
    if (engine) {
      try {
        const driver = engine.getAudioDriver?.() as any;
        const shakaPlayer = driver?.player;
        if (shakaPlayer) {
          const tracks = shakaPlayer.getVariantTracks?.() || [];
          const activeTrack = tracks.find((t: any) => t.active) || tracks[0];
          if (activeTrack) {
            if (typeof activeTrack.bandwidth === 'number' && activeTrack.bandwidth > 0) {
              bitrate = activeTrack.bandwidth;
            }
            if (activeTrack.sampleRate || activeTrack.audioSamplingRate) {
              sampleRate = activeTrack.sampleRate || activeTrack.audioSamplingRate;
            }
            if (activeTrack.codecs || activeTrack.audioCodec) {
              codec = activeTrack.codecs || activeTrack.audioCodec;
            }
          }
          const stats = shakaPlayer.getStats?.();
          if (stats?.streamBandwidth && !bitrate) {
            bitrate = stats.streamBandwidth;
          }
        }
      } catch {
        // Silently handled
      }
    }

    return {
      activeClient: s.activeClient,
      activeItag: s.activeItag,
      codec,
      bitrate,
      sampleRate,
      bufferedAheadSeconds: s.bufferedAheadSeconds,
      bufferedPercent: s.bufferedPercent,
      playbackState: s.playbackState,
      networkAdapter: isDirect ? 'web-extension' : s.networkAdapterType,
      verdicts: s.verdicts,
      streamingStatus,
    };
  },

  getHomeFeed: async (moodParam?: string, options?: SyntheticShelfOptions): Promise<HomeFeedData> => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = getSharedEngine();
    }
    if (!engine) return { chips: [], quickPicks: [], shelves: [] };
    return engine.getHomeFeed(moodParam, options);
  },

  getExploreFeed: async (): Promise<HomeFeedData> => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = getSharedEngine();
    }
    if (!engine) return { chips: [], quickPicks: [], shelves: [] };
    return engine.getExploreFeed();
  },

  getNextRadio: async (videoId: string, playlistId?: string): Promise<NextRadioData> => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = getSharedEngine();
    }
    if (!engine) return { queue: [], related: [] };
    const radioData = await engine.getNextRadio(videoId, playlistId);
    if (radioData.queue.length > 0) {
      const currentTrack = get().currentTrack;
      const firstRadioTrack = radioData.queue[0];
      if (
        currentTrack &&
        firstRadioTrack &&
        (currentTrack.videoId === firstRadioTrack.videoId || currentTrack.title === 'Loading...')
      ) {
        const enriched: Track = {
          ...currentTrack,
          title: (currentTrack.title === 'Loading...' ? firstRadioTrack.title : currentTrack.title) || firstRadioTrack.title,
          artist: (currentTrack.artist === 'YouTube Music' ? firstRadioTrack.artist : currentTrack.artist) || firstRadioTrack.artist,
          thumbnail: (!currentTrack.thumbnail ? firstRadioTrack.thumbnail : currentTrack.thumbnail) || firstRadioTrack.thumbnail,
          duration: firstRadioTrack.duration || currentTrack.duration,
        };
        const q = engine.getQueue();
        if (q.length > 0 && (q[0].videoId === enriched.videoId || q[0].title === 'Loading...')) {
          q[0] = enriched;
          (engine as any).queue = q;
        }
        set({ currentTrack: enriched, queue: [...engine.getQueue()] });
      }

      const currentQueue = get().queue;
      const existingIds = new Set(currentQueue.map((t) => t.id || t.videoId));
      const newTracks = radioData.queue.filter((t) => !existingIds.has(t.id || t.videoId));
      if (newTracks.length > 0) {
        for (const t of newTracks) {
          engine.addToQueue(t);
        }
      }
    }
    return radioData;
  },

  getArtist: async (browseId: string): Promise<ArtistDetails> => {
    let engine = get().engine || getSharedEngine();
    if (!engine) {
      const adapterType: NetworkAdapterType = get().networkAdapterType || 'dev-proxy';
      const adapter = createNetworkAdapter(adapterType);
      const shared = new PlayerEngine({ networkAdapter: adapter });
      setSharedEngine(shared);
      set({
        engine: shared,
        networkAdapterType: adapterType,
        streamingStatus: adapterType === 'web-extension' ? 'Direct CDN via Extension' : 'Edge Fallback Proxy',
      });
      engine = shared;
    }
    return engine.getArtist(browseId);
  },

  getAlbum: async (browseId: string): Promise<AlbumDetails> => {
    let engine = get().engine || getSharedEngine();
    if (!engine) {
      const adapterType: NetworkAdapterType = get().networkAdapterType || 'dev-proxy';
      const adapter = createNetworkAdapter(adapterType);
      const shared = new PlayerEngine({ networkAdapter: adapter });
      setSharedEngine(shared);
      set({
        engine: shared,
        networkAdapterType: adapterType,
        streamingStatus: adapterType === 'web-extension' ? 'Direct CDN via Extension' : 'Edge Fallback Proxy',
      });
      engine = shared;
    }
    return engine.getAlbum(browseId);
  },

  getPlaylist: async (playlistId: string): Promise<RemotePlaylistDetails> => {
    let engine = get().engine || getSharedEngine();
    if (!engine) {
      const adapterType: NetworkAdapterType = get().networkAdapterType || 'dev-proxy';
      const adapter = createNetworkAdapter(adapterType);
      const shared = new PlayerEngine({ networkAdapter: adapter });
      setSharedEngine(shared);
      set({
        engine: shared,
        networkAdapterType: adapterType,
        streamingStatus: adapterType === 'web-extension' ? 'Direct CDN via Extension' : 'Edge Fallback Proxy',
      });
      engine = shared;
    }
    return engine.getPlaylist(playlistId);
  },

  search: async (query: string): Promise<Track[]> => {
    let engine = get().engine;
    if (!engine) {
      get().initialize();
      engine = getSharedEngine();
    }
    if (!engine) return [];
    return engine.search(query);
  },
});
