import { NextRequest, NextResponse } from 'next/server';
import { getFreshRollingUrl } from '@/lib/yt-proxy/rollingUrl';
import { getBaseHeaders } from '@/lib/yt-proxy/streamHeaders';
import { buildStreamResponse, STREAM_CORS_HEADERS } from '@/lib/yt-proxy/streamResponse';
import { isValidVideoId, parseStreamTarget } from '@/lib/yt-proxy/streamTarget';
import {
  fetchFollowingRedirects,
  fetchWithFallback,
  UpstreamError,
} from '@/lib/yt-proxy/upstreamFetch';

export const dynamic = 'force-dynamic';

type Method = 'GET' | 'HEAD';

/**
 * googlevideo rejects HEAD (403/405) for most stream urls. Probe with a one
 * byte range instead: if that works the url is good, answer HEAD with a 200.
 */
async function probeWithRange(
  targetUrl: string,
  clientParam: string,
  signal: AbortSignal | undefined
): Promise<Response> {
  const probe = await fetchWithFallback(targetUrl, getBaseHeaders(clientParam, 'bytes=0-0'), signal);
  await probe.body?.cancel();
  if (!probe.ok) return probe;

  const headers = new Headers({ 'accept-ranges': 'bytes' });
  const contentType = probe.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  return new Response(null, { status: 200, headers });
}

async function handle(req: NextRequest, method: Method): Promise<NextResponse> {
  try {
    const target = parseStreamTarget(req.nextUrl.searchParams.get('url'));
    if (!target.ok) {
      return new NextResponse(target.message, { status: target.status });
    }

    const videoIdParam =
      req.nextUrl.searchParams.get('v') ||
      req.nextUrl.searchParams.get('_v') ||
      req.nextUrl.searchParams.get('videoId');
    const videoId = isValidVideoId(videoIdParam) ? videoIdParam : '';
    const clientParam = target.url.searchParams.get('c') || '';
    const itagParam = parseInt(target.url.searchParams.get('itag') || '140', 10);
    const rangeHeader = req.headers.get('range');
    const headers = getBaseHeaders(clientParam, rangeHeader || undefined);

    let upstreamRes: Response;
    if (method === 'HEAD') {
      upstreamRes = await fetchFollowingRedirects(target.url.href, {
        method,
        headers,
        signal: req.signal,
      });
      if (!upstreamRes.ok) {
        await upstreamRes.body?.cancel();
        upstreamRes = await probeWithRange(target.url.href, clientParam, req.signal);
      }
    } else {
      upstreamRes = await fetchWithFallback(target.url.href, headers, req.signal);
    }

    // 403 on stream request: mint a fresh URL (preferring a different client) and retry once
    if (upstreamRes.status === 403 && videoId && method === 'GET') {
      const match = rangeHeader?.match(/bytes=(\d+)-/);
      const reqStart = match ? parseInt(match[1], 10) : 0;
      const freshUrl = await getFreshRollingUrl(videoId, itagParam, reqStart, undefined, clientParam);
      const fresh = freshUrl ? parseStreamTarget(freshUrl) : null;
      if (fresh?.ok) {
        const freshClient = fresh.url.searchParams.get('c') || clientParam;
        const retryRes = await fetchWithFallback(
          fresh.url.href,
          getBaseHeaders(freshClient, rangeHeader || undefined),
          req.signal
        );
        if (retryRes.ok) {
          await upstreamRes.body?.cancel();
          upstreamRes = retryRes;
        } else {
          await retryRes.body?.cancel();
        }
      }
    }

    if (!upstreamRes.ok) {
      await upstreamRes.body?.cancel();
      return new NextResponse(`Upstream streaming error: HTTP ${upstreamRes.status}`, {
        status: upstreamRes.status,
      });
    }

    return buildStreamResponse(upstreamRes, rangeHeader, method);
  } catch (error: any) {
    if (error instanceof UpstreamError) {
      return new NextResponse(error.message, { status: error.status });
    }
    return new NextResponse(`Streaming error: ${error?.message || error}`, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req, 'GET');
}

export async function HEAD(req: NextRequest) {
  return handle(req, 'HEAD');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: STREAM_CORS_HEADERS });
}
