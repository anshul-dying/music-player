import { PlayerResponse } from '../types';

/**
 * Modern Innertube browser fallback.
 * Direct unproxied Innertube browser fetches trigger CORS/403 preflight errors against YouTube.
 * Streaming is handled cleanly by the companion extension via WebExtensionAdapter or DevProxyAdapter.
 */
export async function fetchWebPlayerFallback(_videoId: string): Promise<PlayerResponse | null> {
  return null;
}

