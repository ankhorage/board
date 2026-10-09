import { describe, expect, it } from 'bun:test';

import { CAPABILITIES } from '../src/capabilities/index.js';

describe('public capability catalog', () => {
  it('imports the compiled public capability catalog', async () => {
    const { CAPABILITIES: publishedCapabilities } = await import('@ankhorage/board/capabilities');

    expect(publishedCapabilities).toEqual(CAPABILITIES);
  });
});
