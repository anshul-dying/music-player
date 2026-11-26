import { getFallbackHeaders, getMinimalHeaders } from './streamHeaders';
import { isAllowedStreamUrl } from './streamTarget';

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class UpstreamError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * Follows redirects by hand so every hop is checked against the same host
 * allowlist as the original target.
 */
export async function fetchFollowingRedirects(
  targetUrl: string,
  init: RequestInit
): Promise<Response> {
  let current = targetUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, { ...init, redirect: 'manual' });
    const location = res.headers.get('location');
    if (!REDIRECT_STATUSES.has(res.status) || !location) {
      return res;
    }
    await res.body?.cancel();
    const next = new URL(location, current);
    if (!isAllowedStreamUrl(next)) {
      throw new UpstreamError(403, 'Forbidden redirect target');
    }
    current = next.href;
  }
  throw new UpstreamError(502, 'Too many redirects');
}

const UPSTREAM_TIMEOUT_MS = 8000;

function withTimeoutSignal(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  if (!signal) return timeout;
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal;
}

/**
 * Fetches the stream and, when the CDN answers 403, retries with browser-like
 * headers and then with minimal headers before giving up.
 */
export async function fetchWithFallback(
  targetUrl: string,
  headers: Record<string, string>,
  signal: AbortSignal | undefined
): Promise<Response> {
  const attempt = (attemptHeaders: Record<string, string>) =>
    fetchFollowingRedirects(targetUrl, {
      method: 'GET',
      headers: attemptHeaders,
      signal: withTimeoutSignal(signal),
    });

  const first = await attempt(headers);
  if (first.status !== 403) {
    return first;
  }

  const range = headers['Range'];
  try {
    for (const retryHeaders of [getFallbackHeaders(range), getMinimalHeaders(range)]) {
      const retry = await attempt(retryHeaders);
      if (retry.ok) {
        await first.body?.cancel();
        return retry;
      }
      await retry.body?.cancel();
    }
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    // network failure on a retry: fall through to the original response
  }
  return first;
}
