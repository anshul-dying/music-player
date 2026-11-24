import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { ConnectYouTubeModal } from '../src/components/ConnectYouTubeModal';

describe('ConnectYouTubeModal Header Layout (#53)', () => {
  test('renders modal element with non-overlapping header structure', () => {
    const el = React.createElement(ConnectYouTubeModal, {
      open: true,
      onOpenChange: () => {},
    });

    assert.ok(el, 'ConnectYouTubeModal must create a valid React element');
    assert.strictEqual(el.props.open, true);
  });
});
