import {
  AlbumDetails,
  ArtistDetails,
  HomeFeedData,
  InnerTubeClientName,
  NextRadioData,
  PlayerResponse,
  RemotePlaylistDetails,
  Track,
} from '../types';
import { NativeHttpAdapter, NetworkAdapter } from '../adapters/network';
import {
  INNERTUBE_CONTEXTS,
  INNERTUBE_PUBLIC_KEY,
  InnerTubeClientOptions,
} from './contexts';
import { parseSearchResults } from './searchParsers';
import { parseHomeFeed, parseNextRadio, type SyntheticShelfOptions } from './feedParsers';
import {
  parseAlbumDetails,
  parseArtistDetails,
  parsePlaylistDetails,
} from './browseParsers';
import {
  parseLikedVideos,
  parseLibraryPlaylists,
  requestAuthenticatedBrowse,
  requestLikeStatus,
} from './libraryParsers';
import { fetchWebPlayerFallback } from './webFallback';

export * from './contexts';
export * from './parsers';
export * from './shelfParsers';
export * from './searchParsers';
export * from './feedParsers';
export * from './browseParsers';
export * from './libraryParsers';

export class InnerTubeClient {
  private network: NetworkAdapter;
  private baseUrl: string;

  constructor(options: InnerTubeClientOptions = {}) {
    this.network = options.networkAdapter || new NativeHttpAdapter();
    this.baseUrl = options.baseUrl || 'https://music.youtube.com';
  }

  setNetworkAdapter(adapter: NetworkAdapter): void {
    this.network = adapter;
  }

  getNetworkAdapter(): NetworkAdapter {
    return this.network;
  }

  /**
   * Fetch player streaming metadata for a videoId using text/plain JSON POST
   */
  async getPlayer(
    videoId: string,
    clientName: InnerTubeClientName = 'VISIONOS'
  ): Promise<PlayerResponse> {
    const context = INNERTUBE_CONTEXTS[clientName];
    const endpoint = `${this.baseUrl}/youtubei/v1/player?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;

    const payload = {
      context,
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
      playbackContext: {
        contentPlaybackContext: {
          signatureTimestamp: 19800,
        },
      },
    };

    try {
      const resp = await this.network.postJson<PlayerResponse>(endpoint, payload, {
        'Content-Type': 'text/plain',
        'X-YouTube-Client-Name': context.client.clientName,
        'X-YouTube-Client-Version': context.client.clientVersion,
      });
      if (resp && resp.playabilityStatus?.status === 'OK') {
        return resp;
      }
    } catch {
      // Fall through to resilient Innertube web fallback
    }

    if (clientName === 'WEB_REMIX' || clientName === 'WEB') {
      const fallback = await fetchWebPlayerFallback(videoId);
      if (fallback) return fallback;
    }

    return {
      playabilityStatus: { status: 'UNPLAYABLE', reason: 'Unable to stream audio' },
    };
  }

  /**
   * Search InnerTube and parse matching tracks
   */
  async search(
    query: string,
    clientName: InnerTubeClientName = 'WEB_REMIX',
    params?: string
  ): Promise<Track[]> {
    const context = INNERTUBE_CONTEXTS[clientName];
    const endpoint = `${this.baseUrl}/youtubei/v1/search?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;

    const payload: Record<string, any> = {
      context,
      query,
    };
    if (params) {
      payload.params = params;
    }

    const data = await this.network.postJson<any>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });

    return this.parseSearchResults(data);
  }

  /**
   * Fetch YouTube Music Home feed (chips, quick picks, shelves)
   */
  async getHomeFeed(moodParam?: string, options?: SyntheticShelfOptions): Promise<HomeFeedData> {
    const browseId = 'FEmusic_home';
    const data = await this.browseAuthenticated(browseId, moodParam);
    return this.parseHomeFeed(data, options);
  }

  /**
   * Fetch YouTube Music Explore feed (new releases, charts, moods & genres)
   */
  async getExploreFeed(): Promise<HomeFeedData> {
    const browseId = 'FEmusic_explore';
    const data = await this.browseAuthenticated(browseId);
    return this.parseHomeFeed(data);
  }

  /**
   * Fetch Up Next radio queue and related content for a given videoId
   */
  async getNextRadio(
    videoId: string,
    playlistId?: string,
    clientName: InnerTubeClientName = 'WEB_REMIX'
  ): Promise<NextRadioData> {
    const context = INNERTUBE_CONTEXTS[clientName];
    const endpoint = `${this.baseUrl}/youtubei/v1/next?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;

    const payload: Record<string, any> = {
      context,
      videoId,
      enablePersistentPlaylistPanel: true,
      isAudioOnly: true,
    };
    if (playlistId) {
      payload.playlistId = playlistId;
    }

    const data = await this.network.postJson<any>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });

    return this.parseNextRadio(data);
  }

  /**
   * Raw browse request against YouTube Music InnerTube API
   */
  async browse(
    browseId: string,
    params?: string,
    clientName: InnerTubeClientName = 'WEB_REMIX'
  ): Promise<any> {
    const context = INNERTUBE_CONTEXTS[clientName];
    const endpoint = `${this.baseUrl}/youtubei/v1/browse?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;

    const payload: Record<string, any> = {
      context,
      browseId,
    };
    if (params) {
      payload.params = params;
    }

    return this.network.postJson<any>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });
  }

  /**
   * Fetch full artist details including top songs, albums, singles, and related artists
   */
  async getArtist(browseId: string): Promise<ArtistDetails> {
    const data = await this.browse(browseId);
    return parseArtistDetails(browseId, data, (d) => this.parseSearchResults(d));
  }

  /**
   * Fetch full album details and tracklist
   */
  async getAlbum(browseId: string): Promise<AlbumDetails> {
    const data = await this.browse(browseId);
    return parseAlbumDetails(browseId, data, (d) => this.parseSearchResults(d));
  }

  /**
   * Fetch full playlist details and tracklist (YouTube or remote)
   */
  async getPlaylist(playlistId: string): Promise<RemotePlaylistDetails> {
    const cleanId = playlistId.replace(/^VL/, '');
    const browseId = `VL${cleanId}`;
    const data = await this.browseAuthenticated(browseId);
    return parsePlaylistDetails(playlistId, data, (d) => this.parseSearchResults(d));
  }

  /**
   * Helper to perform authenticated browse or fall back to standard/proxy browse
   */
  async browseAuthenticated(
    browseId: string,
    params?: string,
    clientName: InnerTubeClientName = 'WEB_REMIX'
  ): Promise<any> {
    return requestAuthenticatedBrowse(this.network, this.baseUrl, browseId, params, clientName);
  }

  /**
   * Fetch authenticated user's liked videos (or fallback to dev proxy if unauthenticated)
   */
  async getLikedVideos(clientName: InnerTubeClientName = 'WEB_REMIX'): Promise<Track[]> {
    const data = await this.browseAuthenticated('FEmusic_liked_videos', undefined, clientName);
    return this.parseLikedVideos(data);
  }

  /**
   * Fetch authenticated user's library playlists (or fallback to dev proxy if unauthenticated)
   */
  async getLibraryPlaylists(
    clientName: InnerTubeClientName = 'WEB_REMIX'
  ): Promise<RemotePlaylistDetails[]> {
    const data = await this.browseAuthenticated('FEmusic_library_landing', undefined, clientName);
    return this.parseLibraryPlaylists(data);
  }

  /**
   * Update like status for a video ('LIKE' or 'INDIFFERENT')
   */
  async setLikeStatus(
    videoId: string,
    status: 'LIKE' | 'INDIFFERENT',
    clientName: InnerTubeClientName = 'WEB_REMIX'
  ): Promise<boolean> {
    return requestLikeStatus(this.network, this.baseUrl, videoId, status, clientName);
  }

  parseHomeFeed(data: any, options?: SyntheticShelfOptions): HomeFeedData { return parseHomeFeed(data, options); }
  parseNextRadio(data: any): NextRadioData { return parseNextRadio(data); }
  parseSearchResults(data: any): Track[] { return parseSearchResults(data); }
  parseLikedVideos(data: any): Track[] { return parseLikedVideos(data); }
  parseLibraryPlaylists(data: any): RemotePlaylistDetails[] { return parseLibraryPlaylists(data); }
}
