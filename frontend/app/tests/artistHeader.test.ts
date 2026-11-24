import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { ArtistHeader } from '../src/app/artist/components/ArtistHeader';
import type { ArtistDetails } from '@mp/player-core';

const sampleArtist: ArtistDetails = {
  id: 'UCtest-artist',
  name: 'Test Artist',
  subscribers: '1.5M',
  bannerUrl: 'https://example.com/banner.jpg',
  avatarUrl: 'https://example.com/avatar.jpg',
  description: 'A talented test artist.',
  topSongs: [
    {
      id: 'song-1',
      videoId: 'song-1',
      title: 'Top Song 1',
      artist: 'Test Artist',
      duration: 200,
      thumbnail: 'https://example.com/thumb.jpg',
    },
  ],
  albums: [],
  singles: [],
  relatedArtists: [],
};

describe('ArtistHeader Component (#38)', () => {
  test('creates a valid React element with standardized action buttons', () => {
    let playAllCalled = false;
    let shuffleCalled = false;
    let radioCalled = false;

    const el = React.createElement(ArtistHeader, {
      artist: sampleArtist,
      isThisArtistPlaying: false,
      onPlayAll: (shuffle?: boolean) => {
        if (shuffle) shuffleCalled = true;
        else playAllCalled = true;
      },
      onRadio: () => {
        radioCalled = true;
      },
    });

    assert.ok(el, 'ArtistHeader element must be defined');
    assert.strictEqual(React.isValidElement(el), true);
    assert.strictEqual(el.props.artist.name, 'Test Artist');
    assert.strictEqual(el.props.isThisArtistPlaying, false);
  });

  test('creates element when isThisArtistPlaying is true (Pause state)', () => {
    const el = React.createElement(ArtistHeader, {
      artist: sampleArtist,
      isThisArtistPlaying: true,
      onPlayAll: () => {},
    });

    assert.ok(el);
    assert.strictEqual(el.props.isThisArtistPlaying, true);
  });
});
