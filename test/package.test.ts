import { areCapabilitiesEqual, isCapability } from '@ankhorage/contracts/capabilities';
import { describe, expect, it } from 'bun:test';

import packageJson from '../package.json';
import { CAPABILITIES } from '../src/capabilities/index.js';

describe('package metadata', () => {
  it('publishes the expected package shape', () => {
    expect(packageJson.name).toBe('@ankhorage/board');
    expect(packageJson.type).toBe('module');
    expect(packageJson.bin).toEqual({
      'ankhorage-board': './dist/cli/index.js',
    });
    expect(packageJson.exports).toEqual({
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
    });
  });

  it('publishes the canonical Ankh capability descriptors without drift', () => {
    expect(packageJson.ankh.category).toBe('board');
    expect(packageJson.ankh.provider).toBe('./dist/ankh.provider.js');
    expect(packageJson.ankh.capabilities).toHaveLength(CAPABILITIES.length);
    expect(packageJson.ankh.capabilities.every(isCapability)).toBeTrue();

    for (const [index, capability] of CAPABILITIES.entries()) {
      const published = packageJson.ankh.capabilities.at(index);
      expect(published).toBeDefined();
      if (published === undefined) continue;
      expect(areCapabilitiesEqual(published, capability)).toBeTrue();
    }
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
