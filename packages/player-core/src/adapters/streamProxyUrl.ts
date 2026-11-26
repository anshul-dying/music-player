/**
 * Resolves the fallback stream proxy URL for non-extension / proxied playback.
 * Supports offloading audio byte-range proxying to an external edge worker via
 * `NEXT_PUBLIC_EDGE_STREAM_PROXY_URL` to protect origin server egress & IP reputation.
 */
export function buildStreamProxyUrl(
  targetUrl: string,
  videoId?: string,
  options: { proxyBaseUrl?: string; edgeProxyUrl?: string } = {}
): string {
  if (targetUrl.includes('/stream?url=')) {
    if (videoId && !targetUrl.includes('&v=')) {
      return `${targetUrl}&v=${encodeURIComponent(videoId)}`;
    }
    return targetUrl;
  }

  const vParam = videoId ? `&v=${encodeURIComponent(videoId)}` : '';
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const envEdgeUrl = proc?.env?.NEXT_PUBLIC_EDGE_STREAM_PROXY_URL;
  const edgeBase = (options.edgeProxyUrl ?? envEdgeUrl ?? '').trim().replace(/\/+$/, '');

  if (edgeBase) {
    return `${edgeBase}?url=${encodeURIComponent(targetUrl)}${vParam}`;
  }

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:3000';
  const proxyBase = options.proxyBaseUrl || '/api/yt';
  return `${origin}${proxyBase}/stream?url=${encodeURIComponent(targetUrl)}${vParam}`;
}
