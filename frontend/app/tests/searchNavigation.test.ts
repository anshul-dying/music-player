import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchUrl,
  shouldSyncUrlQueryToLocalState,
} from '../src/hooks/useSearchNavigation';

describe('Search Navigation & Whitespace Handling (#34)', () => {
  describe('buildSearchUrl', () => {
    test('preserves trailing spaces in query instead of trimming them', () => {
      const url = buildSearchUrl('/search', 'c418 ', null);
      assert.ok(url !== null);
      const searchParams = new URLSearchParams(url.replace('/search?', ''));
      assert.equal(searchParams.get('q'), 'c418 ');
    });

    test('preserves active track v param when music is playing', () => {
      const url = buildSearchUrl('/search', 'c418 blind spots', 'abc123vid');
      assert.ok(url !== null);
      const searchParams = new URLSearchParams(url.replace('/search?', ''));
      assert.equal(searchParams.get('q'), 'c418 blind spots');
      assert.equal(searchParams.get('v'), 'abc123vid');
    });

    test('preserves trailing spaces while music is playing', () => {
      const url = buildSearchUrl('/search', 'c418 ', 'trackPlaying456');
      assert.ok(url !== null);
      const searchParams = new URLSearchParams(url.replace('/search?', ''));
      assert.equal(searchParams.get('q'), 'c418 ');
      assert.equal(searchParams.get('v'), 'trackPlaying456');
    });

    test('navigates to / when clearing search on /search route', () => {
      const urlEmpty = buildSearchUrl('/search', '', null);
      assert.equal(urlEmpty, '/');

      const urlWhitespace = buildSearchUrl('/search', '    ', null);
      assert.equal(urlWhitespace, '/');
    });

    test('returns null when query is empty on non-search route', () => {
      const url = buildSearchUrl('/', '', null);
      assert.equal(url, null);

      const urlWhitespace = buildSearchUrl('/library', '   ', 'v1');
      assert.equal(urlWhitespace, null);
    });
  });

  describe('shouldSyncUrlQueryToLocalState', () => {
    test('rejects URL sync when user is actively typing to prevent space stripping', () => {
      const shouldSync = shouldSyncUrlQueryToLocalState({
        isTyping: true,
        urlQuery: 'c418',
        lastPushedQuery: null,
        localQuery: 'c418 ',
      });
      assert.equal(shouldSync, false);
    });

    test('rejects URL sync when URL query matches what was pushed by our hook', () => {
      const shouldSync = shouldSyncUrlQueryToLocalState({
        isTyping: false,
        urlQuery: 'c418 ',
        lastPushedQuery: 'c418 ',
        localQuery: 'c418 ',
      });
      assert.equal(shouldSync, false);
    });

    test('rejects URL sync when URL query is null', () => {
      const shouldSync = shouldSyncUrlQueryToLocalState({
        isTyping: false,
        urlQuery: null,
        lastPushedQuery: 'c418',
        localQuery: 'c418',
      });
      assert.equal(shouldSync, false);
    });

    test('allows URL sync on external navigation (e.g. browser back button)', () => {
      const shouldSync = shouldSyncUrlQueryToLocalState({
        isTyping: false,
        urlQuery: 'queen',
        lastPushedQuery: 'c418',
        localQuery: 'c418',
      });
      assert.equal(shouldSync, true);
    });

    test('allows URL sync on external link navigation', () => {
      const shouldSync = shouldSyncUrlQueryToLocalState({
        isTyping: false,
        urlQuery: 'ambient electronic',
        lastPushedQuery: null,
        localQuery: '',
      });
      assert.equal(shouldSync, true);
    });
  });
});
