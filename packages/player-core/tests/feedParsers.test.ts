import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseHomeFeed } from '../src/innertube/feedParsers';
import { generateSyntheticShelves } from '../src/innertube/syntheticShelves';
import { parseShelfItem } from '../src/innertube/shelfParsers';
import type { Track, MediaShelfData } from '../src/types';

describe('Home Feed Section & Grid Renderers', () => {
  test('parses gridRenderer as a media shelf with gridHeaderRenderer', () => {
    const mockData = {
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        gridRenderer: {
                          header: {
                            gridHeaderRenderer: {
                              title: { runs: [{ text: 'Song Mixes' }] },
                              subtitle: { runs: [{ text: 'Endless personalized radio' }] },
                            },
                          },
                          items: [
                            {
                              musicTwoRowItemRenderer: {
                                title: { runs: [{ text: 'Chill Mix' }] },
                                subtitle: { runs: [{ text: 'Mix • Various Artists' }] },
                                navigationEndpoint: {
                                  watchEndpoint: {
                                    videoId: 'vid1',
                                    playlistId: 'RDAMVMvid1',
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    };

    const feed = parseHomeFeed(mockData);
    const shelf = feed.shelves.find((s) => s.title === 'Song Mixes');
    assert.ok(shelf, 'Expected to find Song Mixes shelf from gridRenderer');
    assert.equal(shelf.subtitle, 'Endless personalized radio');
    assert.equal(shelf.items.length, 1);
    assert.equal(shelf.items[0].title, 'Chill Mix');
    assert.equal(shelf.items[0].type, 'playlist');
    assert.equal(shelf.items[0].browseId, 'RDAMVMvid1');
  });

  test('parses musicImmersiveCarouselShelfRenderer', () => {
    const mockData = {
      contents: [
        {
          musicImmersiveCarouselShelfRenderer: {
            header: {
              musicCarouselShelfBasicHeaderRenderer: {
                title: { runs: [{ text: 'Covers and remixes' }] },
                strapline: { runs: [{ text: 'Reimagined versions' }] },
              },
            },
            contents: [
              {
                musicTwoRowItemRenderer: {
                  title: { runs: [{ text: 'Acoustic Hit' }] },
                  subtitle: { runs: [{ text: 'Artist • Cover' }] },
                  navigationEndpoint: {
                    watchEndpoint: { videoId: 'cov1' },
                  },
                },
              },
            ],
          },
        },
      ],
    };

    const feed = parseHomeFeed(mockData);
    const shelf = feed.shelves.find((s) => s.title === 'Covers and remixes');
    assert.ok(shelf, 'Expected to find Covers and remixes shelf');
    assert.equal(shelf.items.length, 1);
    assert.equal(shelf.items[0].title, 'Acoustic Hit');
  });

  test('shelfParsers correctly identifies watchEndpoint playlistId with RD prefix as a playlist mix', () => {
    const item = {
      musicTwoRowItemRenderer: {
        title: { runs: [{ text: 'Pop Radio Mix' }] },
        subtitle: { runs: [{ text: 'Mix • Pop Artists' }] },
        navigationEndpoint: {
          watchEndpoint: {
            videoId: 'pop123',
            playlistId: 'RDAMVMpop123',
          },
        },
      },
    };

    const parsed = parseShelfItem(item);
    assert.ok(parsed);
    assert.equal(parsed.type, 'playlist');
    assert.equal(parsed.browseId, 'RDAMVMpop123');
    assert.equal(parsed.videoId, 'pop123');
  });
});

describe('Synthetic Shelves Fallback Generator', () => {
  const sampleHistory: Track[] = [
    {
      id: 'song1',
      videoId: 'song1',
      title: 'Midnight City',
      artist: 'M83',
      duration: 240,
      thumbnail: 'https://example.com/1.jpg',
    },
    {
      id: 'song2',
      videoId: 'song2',
      title: 'Starboy',
      artist: 'The Weeknd',
      duration: 230,
      thumbnail: 'https://example.com/2.jpg',
    },
  ];

  test('synthesizes Listen Again and Song Mixes when not present in feed', () => {
    const publicShelves: MediaShelfData[] = [
      {
        id: 'public_charts',
        title: "India's biggest hits",
        items: [],
      },
    ];

    const enriched = generateSyntheticShelves(publicShelves, {
      history: sampleHistory,
    });

    const listenAgain = enriched.find((s) => s.title === 'Listen Again');
    assert.ok(listenAgain, 'Listen Again shelf should be synthesized from user history');
    assert.equal(listenAgain.items.length, 2);
    assert.equal(listenAgain.items[0].videoId, 'song1');

    const songMixes = enriched.find((s) => s.title === 'Song Mixes');
    assert.ok(songMixes, 'Song Mixes shelf should be synthesized');
    assert.equal(songMixes.items.length, 2);
    assert.equal(songMixes.items[0].type, 'playlist');
    assert.equal(songMixes.items[0].browseId, 'RDAMVMsong1');
    assert.equal(songMixes.items[0].title, 'Midnight City Mix');

    const trending = enriched.find((s) => s.title === 'Trending Songs for you');
    assert.ok(trending, 'Trending Songs for you shelf should be synthesized');

    const covers = enriched.find((s) => s.title === 'Covers and remixes');
    assert.ok(covers, 'Covers and remixes shelf should be synthesized');
  });

  test('does not duplicate shelves if YouTube already returned them', () => {
    const existingShelves: MediaShelfData[] = [
      {
        id: 'real_listen_again',
        title: 'Listen Again',
        items: [
          {
            id: 'real1',
            type: 'song',
            title: 'Real Song',
            subtitle: 'Real Artist',
            thumbnail: '',
          },
        ],
      },
      {
        id: 'real_song_mixes',
        title: 'Song Mixes',
        items: [],
      },
    ];

    const enriched = generateSyntheticShelves(existingShelves, {
      history: sampleHistory,
    });

    const listenAgainCount = enriched.filter((s) => s.title === 'Listen Again').length;
    assert.equal(listenAgainCount, 1, 'Should keep existing real Listen Again shelf without duplicating');

    const songMixesCount = enriched.filter((s) => s.title === 'Song Mixes').length;
    assert.equal(songMixesCount, 1, 'Should keep existing real Song Mixes shelf without duplicating');
  });
});
