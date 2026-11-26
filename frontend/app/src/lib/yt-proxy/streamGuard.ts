import type { NextRequest } from 'next/server';

export interface StreamGuardConfig {
  windowMs: number;
  maxRequestsPerWindow: number;
  maxConcurrentPerClient: number;
  requireSameOrigin: boolean;
  allowedOrigins: string[];
}

export type StreamGuardResult =
  | { ok: true; release: () => void }
  | { ok: false; status: 403 | 429; message: string; headers?: Record<string, string> };

interface ClientBucket {
  timestamps: number[];
  active: number;
}

const DEFAULT_CONFIG: StreamGuardConfig = {
  windowMs: 60_000,
  maxRequestsPerWindow: 120,
  maxConcurrentPerClient: 8,
  requireSameOrigin: process.env.STREAM_REQUIRE_SAME_ORIGIN === 'true',
  allowedOrigins: (process.env.ALLOWED_STREAM_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

const clientBuckets = new Map<string, ClientBucket>();

export function resetStreamGuardState(): void {
  clientBuckets.clear();
}

export function getClientKey(req: NextRequest): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (xff) return xff;
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'local';
}

function isOriginAllowed(origin: string, expectedOrigin: string, extraAllowed: string[]): boolean {
  if (origin === expectedOrigin) return true;
  return extraAllowed.includes(origin);
}

function checkHotlink(req: NextRequest, config: StreamGuardConfig): StreamGuardResult | null {
  const expectedOrigin = req.nextUrl.origin;
  const originHeader = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');
  const secFetchSite = req.headers.get('sec-fetch-site');

  if (originHeader) {
    if (!isOriginAllowed(originHeader, expectedOrigin, config.allowedOrigins)) {
      return { ok: false, status: 403, message: 'Forbidden: cross-origin stream access denied' };
    }
    return null;
  }

  if (refererHeader) {
    try {
      const refOrigin = new URL(refererHeader).origin;
      if (!isOriginAllowed(refOrigin, expectedOrigin, config.allowedOrigins)) {
        return { ok: false, status: 403, message: 'Forbidden: cross-origin referer denied' };
      }
      return null;
    } catch {
      return { ok: false, status: 403, message: 'Forbidden: invalid referer' };
    }
  }

  if (config.requireSameOrigin && secFetchSite !== 'same-origin') {
    return { ok: false, status: 403, message: 'Forbidden: missing same-origin header' };
  }

  return null;
}

export function checkStreamAccess(
  req: NextRequest,
  overrides: Partial<StreamGuardConfig> = {},
  now = Date.now()
): StreamGuardResult {
  const config: StreamGuardConfig = { ...DEFAULT_CONFIG, ...overrides };

  const hotlinkError = checkHotlink(req, config);
  if (hotlinkError) return hotlinkError;

  const key = getClientKey(req);
  let bucket = clientBuckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [], active: 0 };
    clientBuckets.set(key, bucket);
  }

  const windowStart = now - config.windowMs;
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

  if (bucket.timestamps.length >= config.maxRequestsPerWindow) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000));
    return {
      ok: false,
      status: 429,
      message: 'Too Many Requests: stream rate limit exceeded',
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(config.maxRequestsPerWindow),
        'X-RateLimit-Remaining': '0',
      },
    };
  }

  if (bucket.active >= config.maxConcurrentPerClient) {
    return {
      ok: false,
      status: 429,
      message: 'Too Many Requests: concurrent stream limit exceeded',
      headers: { 'Retry-After': '2' },
    };
  }

  bucket.timestamps.push(now);
  bucket.active += 1;

  let released = false;
  return {
    ok: true,
    release: () => {
      if (released) return;
      released = true;
      bucket!.active = Math.max(0, bucket!.active - 1);
      if (bucket!.active === 0 && bucket!.timestamps.length === 0) {
        clientBuckets.delete(key);
      }
    },
  };
}
