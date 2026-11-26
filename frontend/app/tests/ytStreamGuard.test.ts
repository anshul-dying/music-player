import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { checkStreamAccess, resetStreamGuardState } from '../src/lib/yt-proxy/streamGuard';

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/yt/stream?url=https%3A%2F%2Frr1.googlevideo.com%2Fvideoplayback', {
    headers,
  });
}

afterEach(() => {
  resetStreamGuardState();
});

describe('streamGuard hotlink & origin protection', () => {
  it('allows same-origin Origin header', () => {
    const res = checkStreamAccess(makeReq({ origin: 'http://localhost:3000' }));
    assert.equal(res.ok, true);
    if (res.ok) res.release();
  });

  it('rejects cross-origin Origin header with 403', () => {
    const res = checkStreamAccess(makeReq({ origin: 'https://evil.example.com' }));
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.status, 403);
  });

  it('allows explicitly configured allowedOrigins', () => {
    const res = checkStreamAccess(makeReq({ origin: 'https://app.ganegan.com' }), {
      allowedOrigins: ['https://app.ganegan.com'],
    });
    assert.equal(res.ok, true);
    if (res.ok) res.release();
  });

  it('rejects cross-origin Referer header with 403', () => {
    const res = checkStreamAccess(makeReq({ referer: 'https://evil.example.com/embed' }));
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.status, 403);
  });

  it('rejects headerless requests when requireSameOrigin is true', () => {
    const res = checkStreamAccess(makeReq({}), { requireSameOrigin: true });
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.status, 403);
  });

  it('allows sec-fetch-site=same-origin when requireSameOrigin is true', () => {
    const res = checkStreamAccess(makeReq({ 'sec-fetch-site': 'same-origin' }), {
      requireSameOrigin: true,
    });
    assert.equal(res.ok, true);
    if (res.ok) res.release();
  });
});

describe('streamGuard rate limiting & concurrency', () => {
  it('enforces sliding-window request limit with 429 and Retry-After', () => {
    const now = 1_000_000;
    const opts = { maxRequestsPerWindow: 3, windowMs: 10_000, maxConcurrentPerClient: 10 };

    for (let i = 0; i < 3; i++) {
      const r = checkStreamAccess(makeReq({ 'x-real-ip': '1.2.3.4' }), opts, now + i * 100);
      assert.equal(r.ok, true);
      if (r.ok) r.release();
    }

    const blocked = checkStreamAccess(makeReq({ 'x-real-ip': '1.2.3.4' }), opts, now + 500);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.equal(blocked.status, 429);
      assert.ok(Number(blocked.headers?.['Retry-After']) >= 1);
    }

    // After window elapses, requests are allowed again
    const afterWindow = checkStreamAccess(makeReq({ 'x-real-ip': '1.2.3.4' }), opts, now + 10_500);
    assert.equal(afterWindow.ok, true);
    if (afterWindow.ok) afterWindow.release();
  });

  it('enforces max concurrent streams per client until released', () => {
    const opts = { maxRequestsPerWindow: 100, windowMs: 60_000, maxConcurrentPerClient: 2 };
    const r1 = checkStreamAccess(makeReq({ 'x-real-ip': '9.9.9.9' }), opts);
    const r2 = checkStreamAccess(makeReq({ 'x-real-ip': '9.9.9.9' }), opts);
    const r3 = checkStreamAccess(makeReq({ 'x-real-ip': '9.9.9.9' }), opts);

    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    assert.equal(r3.ok, false);
    if (!r3.ok) assert.equal(r3.status, 429);

    if (r1.ok) r1.release();
    const r4 = checkStreamAccess(makeReq({ 'x-real-ip': '9.9.9.9' }), opts);
    assert.equal(r4.ok, true);
    if (r2.ok) r2.release();
    if (r4.ok) r4.release();
  });
});
