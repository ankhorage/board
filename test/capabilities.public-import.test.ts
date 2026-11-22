import { describe, expect, it } from 'bun:test';

import { CAPABILITIES } from '../src/capabilities/index.js';

describe('public capability catalog', () => {
  it('imports the compiled public capability catalog', async () => {
    const publishedModule: unknown = await import('../dist/capabilities/index.js');

    if (
      typeof publishedModule !== 'object' ||
      publishedModule === null ||
      !('CAPABILITIES' in publishedModule)
    ) {
      throw new Error('The compiled capability entrypoint does not export CAPABILITIES.');
    }

    const publishedCapabilities = publishedModule.CAPABILITIES;

    expect(publishedCapabilities).toEqual(CAPABILITIES);
  });
});
