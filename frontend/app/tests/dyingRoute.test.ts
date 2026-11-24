import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import DyingPage from '../src/app/dying/page';

describe('Dying Route Environment Guard (#29)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  test('calls notFound() and throws NEXT_HTTP_ERROR_FALLBACK;404 in production', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

    assert.throws(
      () => {
        DyingPage();
      },
      (err: unknown) => {
        const error = err as { digest?: string; message?: string };
        return (
          error?.digest?.includes('NEXT_HTTP_ERROR_FALLBACK;404') ||
          error?.message?.includes('NEXT_HTTP_ERROR_FALLBACK;404')
        );
      },
      'Should throw notFound() error when NODE_ENV is production'
    );
  });

  test('renders successfully when NODE_ENV is development', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

    const element = DyingPage();
    assert.ok(element, 'DyingPage should return a React element in development');
    assert.strictEqual(React.isValidElement(element), true);
  });
});
