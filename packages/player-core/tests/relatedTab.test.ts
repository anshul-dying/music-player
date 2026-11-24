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
});
