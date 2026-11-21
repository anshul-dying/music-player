import { PlayerResponse } from '../types';

let cachedYt: any = null;

/**
 * Modern Innertube browser fallback powered by youtubei.js/web.
 * Resolves streams and SABR audio formats when standard endpoints are bot-checked.
 */
export async function fetchWebPlayerFallback(videoId: string): Promise<PlayerResponse | null> {
  // Browser fallback only: require browser window with companion extension, and never run in tests
  const isTest = (globalThis as any).process?.env?.NODE_ENV === 'test';
  if (
    isTest ||
    typeof window === 'undefined' ||
    !(window as any).__MP_EXTENSION_ACTIVE__
  ) {
    return null;
  }
  try {
    const { Innertube } = await import('youtubei.js/web');
    if (!cachedYt) {
      cachedYt = await Innertube.create();
    }
    const info = await cachedYt.getInfo(videoId);
    const serverAbrStreamingUrl = info.streaming_data?.server_abr_streaming_url;
    const adaptiveFormats = (info.streaming_data?.adaptive_formats || []).map((f: any) => ({
      itag: f.itag,
      mimeType: f.mime_type,
      bitrate: f.bitrate,
      url: f.url,
      contentLength: f.content_length?.toString(),
      approxDurationMs: f.approx_duration_ms?.toString(),
      loudnessDb: f.loudness_db,
      audioSampleRate: f.audio_sample_rate?.toString(),
      audioChannels: f.audio_channels,
      initRange: f.init_range ? { start: String(f.init_range.start), end: String(f.init_range.end) } : undefined,
      indexRange: f.index_range ? { start: String(f.index_range.start), end: String(f.index_range.end) } : undefined,
    }));

    return {
      playabilityStatus: {
        status: info.playability_status?.status || 'OK',
        reason: info.playability_status?.reason || '',
      },
      streamingData: {
        serverAbrStreamingUrl,
        adaptiveFormats,
      },
    };
  } catch {
    return null;
  }
}
