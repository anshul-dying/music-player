import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNextRadio, parseRelatedBrowse } from '../src/innertube/nextRadioParsers';

describe('Issue #25 related tab parsers', () => {
  it('parseNextRadio extracts relatedBrowseId from lazy Related tab', () => {
    const mockNextResponse = {
      contents: {
        singleColumnMusicWatchNextResultsRenderer: {
          tabbedRenderer: {
            watchNextTabbedResultsRenderer: {
              tabs: [
                {
                  tabRenderer: {
                    title: 'Up next',
                    content: {
                      musicQueueRenderer: {
                        content: {
                          playlistPanelRenderer: {
                            contents: [
                              {
                                playlistPanelVideoRenderer: {
                                  videoId: 'vid-1',
                                  title: { runs: [{ text: 'Song One' }] },
                                  longBylineText: { runs: [{ text: 'Artist One' }] },
                                  lengthText: { simpleText: '3:15' },
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
                { tabRenderer: { title: 'Lyrics' } },
                {
                  tabRenderer: {
                    title: 'Related',
                    endpoint: {
                      browseEndpoint: {
                        browseId: 'MPTRt_lazy_related_123',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    const result = parseNextRadio(mockNextResponse);
    assert.equal(result.queue.length, 1);
    assert.equal(result.queue[0].videoId, 'vid-1');
    assert.equal(result.related.length, 0);
    assert.equal(result.relatedBrowseId, 'MPTRt_lazy_related_123');
  });

  it('parseRelatedBrowse extracts related songs and albums', () => {
    const mockBrowse = {
      contents: {
        sectionListRenderer: {
          contents: [
            {
              musicCarouselShelfRenderer: {
                contents: [
                  {
                    musicTwoRowItemRenderer: {
                      title: { runs: [{ text: 'Related Album' }] },
                      subtitle: { runs: [{ text: 'Album • Artist Two' }] },
                      navigationEndpoint: { browseEndpoint: { browseId: 'MPREb_abc123' } },
                      thumbnailRenderer: {
                        musicThumbnailRenderer: {
                          thumbnail: { thumbnails: [{ url: 'https://img.example/1.jpg' }] },
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
    };

    const items = parseRelatedBrowse(mockBrowse);
    assert.equal(items.length, 1);
    assert.equal(items[0].title, 'Related Album');
    assert.equal(items[0].browseId, 'MPREb_abc123');
  });

  it('parseNextRadio extracts Up Next automix filter chips (#69)', () => {
    const mockNext = {
      contents: {
        singleColumnMusicWatchNextResultsRenderer: {
          tabbedRenderer: {
            watchNextTabbedResultsRenderer: {
              tabs: [
                {
                  tabRenderer: {
                    content: {
                      musicQueueRenderer: {
                        subHeaderChipCloud: {
                          chipCloudRenderer: {
                            chips: [
                              {
                                chipCloudChipRenderer: {
                                  text: { runs: [{ text: 'All' }] },
                                  navigationEndpoint: {
                                    queueUpdateCommand: {
                                      fetchContentsCommand: {
                                        watchEndpoint: { videoId: 'vid1', playlistId: 'RDAMVMvid1' },
                                      },
                                    },
                                  },
                                },
                              },
                              {
                                chipCloudChipRenderer: {
                                  text: { runs: [{ text: 'Familiar' }] },
                                  navigationEndpoint: {
                                    queueUpdateCommand: {
                                      fetchContentsCommand: {
                                        watchEndpoint: { videoId: 'vid1', playlistId: 'RDAMVMvid1', params: 'wAEB8gECKAE%3D' },
                                      },
                                    },
                                  },
                                },
                              },
                            ],
                          },
                        },
                        content: { playlistPanelRenderer: { contents: [] } },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    const res = parseNextRadio(mockNext);
    assert.equal(res.chips?.length, 2);
    assert.equal(res.chips?.[1].label, 'Familiar');
    assert.equal(res.chips?.[1].params, 'wAEB8gECKAE%3D');
    assert.equal(res.chips?.[1].playlistId, 'RDAMVMvid1');
  });
});
