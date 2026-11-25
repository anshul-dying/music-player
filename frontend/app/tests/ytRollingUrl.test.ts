import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFreshRollingUrl, RollingUrlCache, selectItagUrl } from '../src/lib/yt-proxy/rollingUrl';
import { stubFetch } from './fetchStub';

const TTL = 5 * 60 * 1000;
let restore: (() => void) | undefined;

afterEach(() => restore?.());

function playerResponse(formats: Array<{ itag: number; url?: string }>): Response {
  return Response.json({ streamingData: { adaptiveFormats: formats } });
}

describe('selectItagUrl', () => {
  const streamingData = {
    formats: [{ itag: 18, url: 'https://a.googlevideo.com/18' }],
    adaptiveFormats: [
      { itag: 140, url: 'https://a.googlevideo.com/140' },
      { itag: 251 },
      { itag: 250, url: '' },
    ],
  };

  it('returns the url of exactly the requested itag', () => {
    assert.equal(selectItagUrl(streamingData, 140), 'https://a.googlevideo.com/140');
    assert.equal(selectItagUrl(streamingData, 18), 'https://a.googlevideo.com/18');
  });

  it('never falls back to another format', () => {
    assert.equal(selectItagUrl(streamingData, 251), null);
    assert.equal(selectItagUrl(streamingData, 250), null);
    assert.equal(selectItagUrl(streamingData, 999), null);
    assert.equal(selectItagUrl(undefined, 140), null);
  });
});

describe('getFreshRollingUrl', () => {
  it('requests the iOS player once and caches the result per itag and window', async () => {
    const stub = stubFetch(() =>
      playerResponse([
        { itag: 140, url: 'https://a.googlevideo.com/140' },
        { itag: 251, url: 'https://a.googlevideo.com/251' },
      ])
    );
    restore = stub.restore;
    const cache = new RollingUrlCache();

    assert.equal(await getFreshRollingUrl('aaaaaaaaaaa', 140, 0, cache), 'https://a.googlevideo.com/140');
    assert.equal(await getFreshRollingUrl('aaaaaaaaaaa', 140, 100, cache), 'https://a.googlevideo.com/140');
    assert.equal(stub.calls.length, 1);

    assert.equal(await getFreshRollingUrl('aaaaaaaaaaa', 251, 0, cache), 'https://a.googlevideo.com/251');
    assert.equal(stub.calls.length, 2);
  });

  it('uses a new cache slot every 45 seconds of audio', async () => {
    const stub = stubFetch(() => playerResponse([{ itag: 140, url: 'https://a.googlevideo.com/140' }]));
    restore = stub.restore;
    const cache = new RollingUrlCache();

    await getFreshRollingUrl('bbbbbbbbbbb', 140, 0, cache);
    await getFreshRollingUrl('bbbbbbbbbbb', 140, 16000 * 46, cache);
    assert.equal(stub.calls.length, 2);
    assert.equal(JSON.parse(stub.calls[1].init.body as string).startTimeSecs, 46);
  });

  it('returns null when the requested itag is missing, even if other formats have urls', async () => {
    const stub = stubFetch(() => playerResponse([{ itag: 140, url: 'https://a.googlevideo.com/140' }]));
    restore = stub.restore;
    const cache = new RollingUrlCache();
    assert.equal(await getFreshRollingUrl('ccccccccccc', 251, 0, cache), null);
    assert.equal(cache.size, 0);
  });

  it('returns null on upstream failure and on invalid video ids without calling out', async () => {
    const stub = stubFetch(() => new Response('nope', { status: 500 }));
    restore = stub.restore;
    const cache = new RollingUrlCache();
    assert.equal(await getFreshRollingUrl('ddddddddddd', 140, 0, cache), null);
    assert.equal(await getFreshRollingUrl('../../etc', 140, 0, cache), null);
    assert.equal(stub.calls.length, 3);
  });
});

describe('RollingUrlCache', () => {
  it('never holds more than maxEntries and evicts the oldest first', () => {
    const cache = new RollingUrlCache(3);
    for (let i = 0; i < 5; i++) cache.set(`k${i}`, `u${i}`, 0);
    assert.equal(cache.size, 3);
    assert.equal(cache.get('k0', 0), null);
    assert.equal(cache.get('k1', 0), null);
    assert.equal(cache.get('k2', 0), 'u2');
    assert.equal(cache.get('k4', 0), 'u4');
  });

  it('treats a re-set key as the newest entry', () => {
    const cache = new RollingUrlCache(2);
    cache.set('a', '1', 0);
    cache.set('b', '2', 0);
    cache.set('a', '3', 0);
    cache.set('c', '4', 0);
    assert.equal(cache.get('b', 0), null);
    assert.equal(cache.get('a', 0), '3');
    assert.equal(cache.get('c', 0), '4');
  });

  it('expires entries after the ttl', () => {
    const cache = new RollingUrlCache();
    cache.set('a', 'u', 0);
    assert.equal(cache.get('a', TTL - 1), 'u');
    assert.equal(cache.get('a', TTL), null);
    assert.equal(cache.size, 0);
  });

  it('drops expired entries when new ones are added', () => {
    const cache = new RollingUrlCache();
    cache.set('old1', 'u', 0);
    cache.set('old2', 'u', 1000);
    cache.set('fresh', 'u', TTL + 5000);
    assert.equal(cache.size, 1);
    assert.equal(cache.get('fresh', TTL + 5000), 'u');
  });
});
