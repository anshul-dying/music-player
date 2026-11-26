import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCategorizedSearchResults } from '../src/innertube/categorizedSearchParser';

describe('parseCategorizedSearchResults (#68)', () => {
  it('categorizes Songs, Artists, Albums, and Playlists from InnerTube shelves and top card', () => {
    const mockResponse = {
      contents: {
        tabbedSearchResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        musicCardShelfRenderer: {
                          title: { runs: [{ text: 'Linkin Park' }] },
                          subtitle: { runs: [{ text: 'Artist • 40M listeners' }] },
                          thumbnail: { musicThumbnailRenderer: { thumbnail: { thumbnails: [{ url: 'https://img/lp.jpg' }] } } },
                          onTap: {
                            browseEndpoint: {
                              browseId: 'UCZU9T1ceaOgwfLRq7OKFU4Q',
                              browseEndpointContextSupportedConfigs: {
                                browseEndpointContextMusicConfig: { pageType: 'MUSIC_PAGE_TYPE_ARTIST' },
                              },
                            },
                          },
                        },
                      },
                      {
                        musicShelfRenderer: {
                          title: { runs: [{ text: 'Songs' }] },
                          contents: [
                            {
                              musicResponsiveListItemRenderer: {
                                playlistItemData: { videoId: 'kXYiU_JCYtU' },
                                flexColumns: [
                                  { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: 'Numb' }] } } },
                                  { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: 'Linkin Park' }, { text: ' • ' }, { text: '3:07' }] } } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        musicShelfRenderer: {
                          title: { runs: [{ text: 'Albums' }] },
                          contents: [
                            {
                              musicResponsiveListItemRenderer: {
                                navigationEndpoint: {
                                  browseEndpoint: {
                                    browseId: 'MPREb_Meteora',
                                    browseEndpointContextSupportedConfigs: {
                                      browseEndpointContextMusicConfig: { pageType: 'MUSIC_PAGE_TYPE_ALBUM' },
                                    },
                                  },
                                },
                                flexColumns: [
                                  { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: 'Meteora' }] } } },
                                  { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: 'Album • Linkin Park' }] } } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        musicShelfRenderer: {
                          title: { runs: [{ text: 'Community playlists' }] },
                          contents: [
                            {
                              musicResponsiveListItemRenderer: {
                                navigationEndpoint: {
                                  browseEndpoint: {
                                    browseId: 'VLPL_BestOfLP',
                                    browseEndpointContextSupportedConfigs: {
                                      browseEndpointContextMusicConfig: { pageType: 'MUSIC_PAGE_TYPE_PLAYLIST' },
                                    },
                                  },
                                },
                                flexColumns: [
                                  { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: 'Best of Linkin Park' }] } } },
                                  { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: 'Playlist • 50 songs' }] } } },
                                ],
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

    const result = parseCategorizedSearchResults(mockResponse);
    assert.equal(result.artists.length, 1);
    assert.equal(result.artists[0].browseId, 'UCZU9T1ceaOgwfLRq7OKFU4Q');
    assert.equal(result.songs.length, 1);
    assert.equal(result.songs[0].videoId, 'kXYiU_JCYtU');
    assert.equal(result.albums.length, 1);
    assert.equal(result.albums[0].browseId, 'MPREb_Meteora');
    assert.equal(result.playlists.length, 1);
    assert.equal(result.playlists[0].browseId, 'VLPL_BestOfLP');
  });
});
