import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  VerdictCache,
  InnerTubeClient,
  executeClientWalk,
  prefetchAudioWarmup,
  NetworkAdapter,
  Track,
} from '../src/index';

describe('Client Walk & VerdictCache', () => {
  it('benches failing clients in VerdictCache for 10 minutes', () => {
    const cache = new VerdictCache();
    cache.clear();

    assert.equal(cache.isBenched('ANDROID_MUSIC'), false);
    assert.deepEqual(cache.getActiveClients(), ['VISIONOS', 'IOS', 'ANDROID_MUSIC', 'WEB_REMIX', 'WEB', 'MWEB']);

    cache.bench('ANDROID_MUSIC', 'Playback restricted');
    assert.equal(cache.isBenched('ANDROID_MUSIC'), true);
    assert.deepEqual(cache.getActiveClients(), ['VISIONOS', 'IOS', 'WEB_REMIX', 'WEB', 'MWEB']);

    cache.unbench('ANDROID_MUSIC');
    assert.equal(cache.isBenched('ANDROID_MUSIC'), false);
  });

  it('prioritizes WEB_REMIX with SABR formats in executeClientWalk', async () => {
    const mockAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(_url: string, body: any): Promise<T> => {
        const clientName = body.context?.client?.clientName;
        if (clientName === 'WEB_REMIX') {
          return {
            playabilityStatus: { status: 'OK' },
            streamingData: {
              serverAbrStreamingUrl: 'https://googlevideo.com/videoplayback?serverabr=1',
              adaptiveFormats: [
                {
                  itag: 251,
                  mimeType: 'audio/webm; codecs="opus"',
                  bitrate: 160000,
                  audioSampleRate: '48000',
                  approxDurationMs: '240000',
                },
                {
                  itag: 140,
                  mimeType: 'audio/mp4; codecs="mp4a.40.2"',
                  bitrate: 128000,
                  audioSampleRate: '44100',
                  approxDurationMs: '240000',
                },
              ],
            },
          } as T;
        }
        return { playabilityStatus: { status: 'ERROR' } } as T;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter });
    const result = await executeClientWalk('sample_vid', client, new VerdictCache());

    assert.equal(result.client, 'WEB_REMIX');
    assert.equal(result.is_sabr, true);
    assert.equal(result.audioFormats.length, 2);
    assert.equal(result.audioFormats[0].is_sabr, true);
    assert.ok(result.serverAbrStreamingUrl?.includes('serverabr=1'));
  });

  it('supports direct formats with VISIONOS when WEB_REMIX is unavailable', async () => {
    const cache = new VerdictCache();
    cache.bench('WEB_REMIX', 'Benched for test');

    const mockAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(_url: string, body: any): Promise<T> => {
        const clientName = body.context?.client?.clientName;
        if (clientName === 'VISIONOS') {
          return {
            playabilityStatus: { status: 'OK' },
            streamingData: {
              adaptiveFormats: [
                {
                  itag: 251,
                  mimeType: 'audio/webm; codecs="opus"',
                  bitrate: 160000,
                  url: 'https://googlevideo.com/videoplayback?itag=251&sparams=visionos',
                  initRange: { start: '0', end: '740' },
                  indexRange: { start: '741', end: '1024' },
                },
              ],
            },
          } as T;
        }
        return { playabilityStatus: { status: 'ERROR' } } as T;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter });
    const result = await executeClientWalk('sample_visionos_vid', client, cache);

    assert.equal(result.client, 'VISIONOS');
    assert.equal(result.is_sabr, false);
    assert.equal(result.audioFormats.length, 1);
    assert.ok(result.audioFormats[0].url?.includes('visionos'));
  });

  it('supports ANDROID_MUSIC client context in executeClientWalk when earlier clients fail', async () => {
    const cache = new VerdictCache();
    cache.bench('VISIONOS', 'Benched for test');
    cache.bench('IOS', 'Benched for test');

    let usedClientName = '';
    const mockAdapter: NetworkAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(_url: string, body: any): Promise<T> => {
        const clientName = body.context?.client?.clientName;
        usedClientName = clientName;
        if (clientName === 'ANDROID_MUSIC') {
          return {
            playabilityStatus: { status: 'OK' },
            streamingData: {
              adaptiveFormats: [
                {
                  itag: 140,
                  mimeType: 'audio/mp4; codecs="mp4a.40.2"',
                  bitrate: 128000,
                  url: 'https://googlevideo.com/videoplayback?itag=140&client=android_music',
                  initRange: { start: '0', end: '632' },
                  indexRange: { start: '633', end: '896' },
                },
              ],
            },
          } as T;
        }
        return { playabilityStatus: { status: 'ERROR' } } as T;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter });
    const result = await executeClientWalk('sample_android_vid', client, cache);

    assert.equal(result.client, 'ANDROID_MUSIC');
    assert.equal(usedClientName, 'ANDROID_MUSIC');
    assert.equal(result.audioFormats.length, 1);
    assert.ok(result.audioFormats[0].url?.includes('android_music'));
  });

  it('prefetches audio warmup by requesting bytes=0-262143 range for the next track', async () => {
    let fetchCalledWithUrl = '';
    let fetchHeaders: Record<string, string> = {};

    const mockAdapter: NetworkAdapter = {
      name: 'mock',
      fetch: async (url: string, init?: RequestInit) => {
        fetchCalledWithUrl = url;
        if (init?.headers) {
          const headers = new Headers(init.headers);
          headers.forEach((val, key) => {
            fetchHeaders[key.toLowerCase()] = val;
          });
        }
        return new Response(new Uint8Array(262144), { status: 206 });
      },
      postJson: async <T>(_url: string, body: any): Promise<T> => {
        const clientName = body.context?.client?.clientName;
        if (clientName === 'VISIONOS') {
          return {
            playabilityStatus: { status: 'OK' },
            streamingData: {
              adaptiveFormats: [
                {
                  itag: 251,
                  mimeType: 'audio/webm; codecs="opus"',
                  bitrate: 160000,
                  url: 'https://googlevideo.com/videoplayback?itag=251&sparams=warmup',
                  initRange: { start: '0', end: '740' },
                  indexRange: { start: '741', end: '1024' },
                },
              ],
            },
          } as T;
        }
        return { playabilityStatus: { status: 'ERROR' } } as T;
      },
    };

    const nextTrack: Track = {
      id: 'warmup_vid_123',
      videoId: 'warmup_vid_123',
      title: 'Warmup Track',
      artist: 'Warmup Artist',
      duration: 210,
      thumbnail: 'https://example.com/thumb.jpg',
    };

    const cache = new VerdictCache();
    await prefetchAudioWarmup(nextTrack, mockAdapter, cache);

    assert.ok(fetchCalledWithUrl.includes('sparams=warmup'));
    assert.equal(fetchHeaders['range'], 'bytes=0-262143');
  });
});
