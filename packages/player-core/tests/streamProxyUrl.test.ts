import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildStreamProxyUrl } from '../src/adapters/streamProxyUrl';

const origEdgeEnv = process.env.NEXT_PUBLIC_EDGE_STREAM_PROXY_URL;

afterEach(() => {
  if (origEdgeEnv === undefined) {
    delete process.env.NEXT_PUBLIC_EDGE_STREAM_PROXY_URL;
  } else {
    process.env.NEXT_PUBLIC_EDGE_STREAM_PROXY_URL = origEdgeEnv;
  }
});

describe('buildStreamProxyUrl', () => {
  it('defaults to local /api/yt/stream when edge proxy URL is unset', () => {
    delete process.env.NEXT_PUBLIC_EDGE_STREAM_PROXY_URL;
    const out = buildStreamProxyUrl('https://rr1.googlevideo.com/videoplayback?itag=251', 'abc123');
    assert.equal(
      out,
      'http://localhost:3000/api/yt/stream?url=https%3A%2F%2Frr1.googlevideo.com%2Fvideoplayback%3Fitag%3D251&v=abc123'
    );
  });

  it('offloads to NEXT_PUBLIC_EDGE_STREAM_PROXY_URL when configured', () => {
    process.env.NEXT_PUBLIC_EDGE_STREAM_PROXY_URL = 'https://stream-edge.example.workers.dev/';
    const out = buildStreamProxyUrl('https://rr1.googlevideo.com/videoplayback?itag=251', 'abc123');
    assert.equal(
      out,
      'https://stream-edge.example.workers.dev?url=https%3A%2F%2Frr1.googlevideo.com%2Fvideoplayback%3Fitag%3D251&v=abc123'
    );
  });

  it('preserves already-proxied stream URLs and appends missing videoId', () => {
    const out = buildStreamProxyUrl('https://stream-edge.example.workers.dev?url=foo&stream?url=bar', 'vid99');
    assert.ok(out.endsWith('&v=vid99'));
  });
});
