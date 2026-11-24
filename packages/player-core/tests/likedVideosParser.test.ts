import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseLikedVideos } from '../src/innertube/libraryParsers';

describe('Issue #43 liked videos parser', () => {
  it('parseLikedVideos parses musicPlaylistShelfRenderer items', () => {
    const mockLikedResponse = {
      contents: {
        singleColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicPlaylistShelfRenderer: {
                          playlistId: 'LM',
                          contents: [
                            {
                              musicResponsiveListItemRenderer: {
                                playlistItemData: { videoId: 'liked-1' },
                                flexColumns: [
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: { runs: [{ text: 'Liked Song 1' }] },
                                    },
                                  },
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: { runs: [{ text: 'Artist A' }, { text: ' • ' }, { text: '3:40' }] },
                                    },
                                  },
                                ],
                                thumbnail: {
                                  musicThumbnailRenderer: {
                                    thumbnail: { thumbnails: [{ url: 'https://img.example/liked1.jpg' }] },
                                  },
                                },
                              },
                            },
                            {
                              musicResponsiveListItemRenderer: {
                                flexColumns: [
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: { runs: [{ text: 'Liked Song 2' }] },
                                    },
                                  },
                                ],
                                menu: {
                                  menuRenderer: {
                                    items: [
                                      {
                                        menuNavigationItemRenderer: {
                                          navigationEndpoint: { watchEndpoint: { videoId: 'liked-2' } },
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
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    };

    const tracks = parseLikedVideos(mockLikedResponse);
    assert.equal(tracks.length, 2);
    assert.equal(tracks[0].videoId, 'liked-1');
    assert.equal(tracks[0].title, 'Liked Song 1');
    assert.equal(tracks[1].videoId, 'liked-2');
    assert.equal(tracks[1].title, 'Liked Song 2');
  });
});
