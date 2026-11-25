import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INNERTUBE_CONTEXTS,
  InnerTubeClient,
} from '../src/index';
import { mockYtmSearchResponse } from './fixtures/mockSearch';
import { mockHomeFeedResponse } from './fixtures/mockHomeFeed';
import { mockNextResponse } from './fixtures/mockNextRadio';

describe('InnerTube Client & Parsers', () => {
  it('defines InnerTube contexts with correct specifications', () => {
    assert.equal(INNERTUBE_CONTEXTS.VISIONOS.client.clientName, 'VISIONOS');
    assert.equal(INNERTUBE_CONTEXTS.VISIONOS.client.clientVersion, '0.1');
    assert.equal(INNERTUBE_CONTEXTS.IOS.client.clientName, 'iOS');
    assert.equal(INNERTUBE_CONTEXTS.ANDROID_MUSIC.client.clientName, 'ANDROID_MUSIC');
    assert.equal(INNERTUBE_CONTEXTS.ANDROID_MUSIC.client.clientVersion, '6.40.52');
    assert.equal(INNERTUBE_CONTEXTS.ANDROID_MUSIC.client.osName, 'Android');
    assert.equal(INNERTUBE_CONTEXTS.ANDROID_MUSIC.client.osVersion, '14');
    assert.equal(INNERTUBE_CONTEXTS.ANDROID_MUSIC.client.platform, 'MOBILE');
    assert.equal(INNERTUBE_CONTEXTS.WEB_REMIX.client.clientName, 'WEB_REMIX');
    assert.equal(INNERTUBE_CONTEXTS.WEB.client.clientName, 'WEB');
    assert.equal(INNERTUBE_CONTEXTS.MWEB.client.clientName, 'MWEB');
  });

  it('parses YouTube Music search responses correctly', () => {
    const client = new InnerTubeClient();
    const tracks = client.parseSearchResults(mockYtmSearchResponse);
    assert.equal(tracks.length, 1);
    assert.equal(tracks[0].videoId, 'abc123xyz');
    assert.equal(tracks[0].title, 'Midnight City');
    assert.equal(tracks[0].artist, 'M83');
    assert.equal(tracks[0].duration, 243); // 4 * 60 + 3
    assert.equal(tracks[0].thumbnail, 'https://example.com/thumb_large.jpg');
  });

  it('parses YouTube Music getHomeFeed response (chips, quickPicks, shelves)', () => {
    const client = new InnerTubeClient();
    const feed = client.parseHomeFeed(mockHomeFeedResponse);

    // Verify chips
    assert.equal(feed.chips.length, 3);
    assert.equal(feed.chips[0].id, 'chip-energize');
    assert.equal(feed.chips[0].title, 'Energize');
    assert.equal(feed.chips[0].params, 'ggMDCNgB');
    assert.equal(feed.chips[0].isActive, true);
    assert.equal(feed.chips[1].id, 'chip-relax');
    assert.equal(feed.chips[1].title, 'Relax');
    assert.equal(feed.chips[1].isActive, false);

    // Verify quick picks
    assert.equal(feed.quickPicks.length, 2);
    assert.equal(feed.quickPicks[0].videoId, 'track1');
    assert.equal(feed.quickPicks[0].title, 'Midnight City');
    assert.equal(feed.quickPicks[0].artist, 'M83');
    assert.equal(feed.quickPicks[0].duration, 243);
    assert.equal(feed.quickPicks[0].thumbnail, 'https://example.com/thumb1.jpg');
    assert.equal(feed.quickPicks[1].videoId, 'track2');
    assert.equal(feed.quickPicks[1].title, 'Starboy');
    assert.equal(feed.quickPicks[1].duration, 230);

    // Verify shelves
    assert.equal(feed.shelves.length, 2);
    assert.equal(feed.shelves[0].title, 'Quick picks');
    assert.equal(feed.shelves[0].subtitle, 'START RADIO FROM A SONG');
    assert.equal(feed.shelves[0].items.length, 2);

    assert.equal(feed.shelves[1].title, 'Trending Albums & Artists');
    assert.equal(feed.shelves[1].items.length, 4);
    assert.equal(feed.shelves[1].items[0].title, "Hurry Up, We're Dreaming");
    assert.equal(feed.shelves[1].items[0].type, 'album');
    assert.equal(feed.shelves[1].items[0].browseId, 'MPREb_123');

    assert.equal(feed.shelves[1].items[1].title, "Today's Hits");
    assert.equal(feed.shelves[1].items[1].type, 'playlist');
    assert.equal(feed.shelves[1].items[1].browseId, 'VLPL123');

    assert.equal(feed.shelves[1].items[2].title, 'Daft Punk');
    assert.equal(feed.shelves[1].items[2].type, 'artist');
    assert.equal(feed.shelves[1].items[2].browseId, 'UC123');

    assert.equal(feed.shelves[1].items[3].title, 'One More Time');
    assert.equal(feed.shelves[1].items[3].type, 'song');
    assert.equal(feed.shelves[1].items[3].videoId, 'song123');
  });

  it('queries /youtubei/v1/browse with WEB_REMIX context and moodParam in getHomeFeed', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    let capturedHeaders: Record<string, string> = {};

    const mockAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> => {
        capturedUrl = url;
        capturedBody = body;
        capturedHeaders = headers;
        return {
          contents: {},
        } as T;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter });
    await client.getHomeFeed('mood_test_123');

    assert.ok(capturedUrl.includes('/youtubei/v1/browse'));
    assert.equal(capturedBody.browseId, 'FEmusic_home');
    assert.equal(capturedBody.params, 'mood_test_123');
    assert.equal(capturedBody.context.client.clientName, 'WEB_REMIX');
    assert.equal(capturedHeaders['X-YouTube-Client-Name'], 'WEB_REMIX');
  });

  it('parses YouTube Music getNextRadio response (queue, related)', () => {
    const client = new InnerTubeClient();
    const result = client.parseNextRadio(mockNextResponse);

    // Verify queue
    assert.equal(result.queue.length, 2);
    assert.equal(result.queue[0].videoId, 'queue1');
    assert.equal(result.queue[0].title, 'Get Lucky');
    assert.equal(result.queue[0].artist, 'Daft Punk');
    assert.equal(result.queue[0].duration, 248);
    assert.equal(result.queue[0].thumbnail, 'https://example.com/qlarge.jpg');

    assert.equal(result.queue[1].videoId, 'queue2');
    assert.equal(result.queue[1].title, 'Instant Crush');
    assert.equal(result.queue[1].artist, 'Daft Punk ft. Julian Casablancas');
    assert.equal(result.queue[1].duration, 337);

    // Verify related
    assert.equal(result.related.length, 2);
    assert.equal(result.related[0].title, 'Justice');
    assert.equal(result.related[0].type, 'artist');
    assert.equal(result.related[0].browseId, 'UC_justice');

    assert.equal(result.related[1].title, 'Discovery');
    assert.equal(result.related[1].type, 'album');
    assert.equal(result.related[1].browseId, 'MPREb_discovery');
  });

  it('queries /youtubei/v1/next with WEB_REMIX context and videoId in getNextRadio', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    let capturedHeaders: Record<string, string> = {};

    const mockAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> => {
        capturedUrl = url;
        capturedBody = body;
        capturedHeaders = headers;
        return {
          contents: {},
        } as T;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter });
    await client.getNextRadio('test_video_abc');

    assert.ok(capturedUrl.includes('/youtubei/v1/next'));
    assert.equal(capturedBody.videoId, 'test_video_abc');
    assert.equal(capturedBody.context.client.clientName, 'WEB_REMIX');
    assert.equal(capturedHeaders['X-YouTube-Client-Name'], 'WEB_REMIX');
  });
});
