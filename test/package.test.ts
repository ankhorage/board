import { isCapabilityCatalog } from '@ankhorage/capability';
import type { AnkhPackageMetadata } from '@ankhorage/contracts/cli';
import { describe, expect, it } from 'bun:test';

import packageJson from '../package.json';
import { CAPABILITIES } from '../src/capabilities/index.js';

const PACKAGE_EXPORTS = {
  '.': {
    types: './dist/index.d.ts',
    import: './dist/index.js',
  },
  './cli': {
    types: './dist/cli/index.d.ts',
    import: './dist/cli/index.js',
  },
  './capabilities': {
    types: './dist/capabilities/index.d.ts',
    import: './dist/capabilities/index.js',
  },
  './package.json': './package.json',
};

describe('package metadata', () => {
  it('publishes the expected package shape', () => {
    expect(packageJson.name).toBe('@ankhorage/board');
    expect(packageJson.type).toBe('module');
    expect(packageJson.bin).toEqual({
      'ankhorage-board': './dist/cli/index.js',
    });
    expect(packageJson.exports).toEqual(PACKAGE_EXPORTS);
  });

  it('publishes exact Ankh package metadata', () => {
    expect(isCapabilityCatalog(CAPABILITIES)).toBe(true);
    expect(isCapabilityCatalog(packageJson.ankh.capabilities)).toBe(true);

    const expectedAnkhMetadata = {
      category: 'board',
      provider: './dist/ankh.provider.js',
      capabilities: CAPABILITIES,
    } satisfies AnkhPackageMetadata;

    expect(JSON.stringify(packageJson.ankh)).toBe(JSON.stringify(expectedAnkhMetadata));
  });

  it('exposes the required scripts for public Ankh packages', () => {
    const requiredScripts = [
      'build',
      'typecheck',
      'lint',
      'lint:fix',
      'format',
      'format:check',
      'test',
      'knip:check',
      'docs',
      'changeset',
      'changeset:status',
      'version-packages',
    ] as const;

    for (const script of requiredScripts) {
      expect(typeof packageJson.scripts[script]).toBe('string');
    }
  });
});
