import type { AnkhRuntimeCommandProvider } from '@ankhorage/ankh';
import { describe, expect, it } from 'bun:test';

import packageJson from '../package.json';
import provider from '../src/ankh.provider.js';
import { CAPABILITIES } from '../src/capabilities/index.js';
import { BOARD_COMMANDS, runBoardCommand } from '../src/commands.js';
import { createBufferedContext } from './testSupport.js';

describe('board provider', () => {
  it('exports the expected provider metadata', () => {
    expect(provider.id).toBe('@ankhorage/board');
    expect(provider.category).toBe('board');
    expect(provider.version).toBe(packageJson.version);
    expect(provider.capabilities).toEqual(CAPABILITIES);
  });

  it('matches the runtime provider shape', () => {
    const typedProvider = provider satisfies AnkhRuntimeCommandProvider;
    expect(typedProvider.commands.length).toBe(3);
    expect(typedProvider.handlers.length).toBe(3);
  });

  it('keeps commands and the catalog in order-independent exact parity', () => {
    const catalogIds = new Set<string>(CAPABILITIES.map(({ id }) => id));
    const commandIds = new Set<string>(provider.commands.map(({ capability }) => capability));

    expect(catalogIds.size).toBe(CAPABILITIES.length);
    expect(commandIds.size).toBe(provider.commands.length);
    expect([...catalogIds].every((capability) => commandIds.has(capability))).toBe(true);
    expect([...commandIds].every((capability) => catalogIds.has(capability))).toBe(true);
  });

  it('keeps command descriptors directly derived from the shared command table', () => {
    expect(provider.commands).toEqual(
      BOARD_COMMANDS.map((command) => ({
        path: command.path,
        capability: command.capability,
        summary: command.summary,
      })),
    );
  });

  it('keeps handlers and descriptors in exact one-to-one alignment', () => {
    const commandsByPath = new Set(provider.commands.map((command) => command.path.join(' ')));
    const { handlers } = provider;
    const handlersByPath = new Set(handlers.map((handler) => handler.path.join(' ')));

    expect(commandsByPath).toEqual(handlersByPath);
    expect(commandsByPath.size).toBe(provider.commands.length);
    expect(handlersByPath.size).toBe(handlers.length);
  });

  it('delegates provider handlers to the shared runner', async () => {
    const handler = provider.handlers.find((entry) => entry.path.join(' ') === 'web')?.handler;
    expect(handler).toBeDefined();
    if (handler === undefined) return;

    const providerContext = createBufferedContext();
    const providerResult = await handler({
      argv: ['https://example.com'],
      context: providerContext,
    });

    const directContext = createBufferedContext();
    const directResult = await runBoardCommand(
      BOARD_COMMANDS[0],
      ['https://example.com'],
      directContext,
    );

    expect(providerResult).toEqual(directResult);
    expect(providerContext.stdout).toBe(directContext.stdout);
    expect(providerContext.stderr).toBe(directContext.stderr);
  });
});
