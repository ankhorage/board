import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'bun:test';

import { CAPABILITIES } from '../src/capabilities/index.js';

describe('public capability catalog', () => {
  it('imports the catalog from a packed external consumer', async () => {
    const consumerDirectory = await mkdtemp(join(tmpdir(), 'board-capabilities-consumer-'));

    try {
      await runAsync(
        ['bun', 'pm', 'pack', '--destination', consumerDirectory, '--quiet'],
        process.cwd(),
      );
      const packedTarball = await findPackedTarballAsync(consumerDirectory);
      await writeFile(
        join(consumerDirectory, 'package.json'),
        JSON.stringify({ name: 'board-capabilities-consumer', private: true, type: 'module' }),
      );
      await runAsync(['bun', 'add', `./${packedTarball}`], consumerDirectory);
      await writeFile(
        join(consumerDirectory, 'consumer.ts'),
        "import { CAPABILITIES } from '@ankhorage/board/capabilities';\nconsole.log(JSON.stringify(CAPABILITIES));\n",
      );

      expect(JSON.parse(await outputAsync(['bun', 'consumer.ts'], consumerDirectory))).toEqual(
        CAPABILITIES,
      );
    } finally {
      await rm(consumerDirectory, { force: true, recursive: true });
    }
  }, 120_000);
});

/*** Runs a packed-consumer command and reports its output when the public boundary fails. */
const runAsync = async (command: string[], cwd: string): Promise<void> => {
  await outputAsync(command, cwd);
};

/*** Runs one packed-consumer command and returns its standard output. */
const outputAsync = async (command: string[], cwd: string): Promise<string> => {
  const process = Bun.spawn(command, { cwd, stderr: 'pipe', stdout: 'pipe' });
  const exitCode = await process.exited;
  const stdout = await new Response(process.stdout).text();
  const stderr = await new Response(process.stderr).text();

  if (exitCode !== 0) {
    throw new Error(`${command.join(' ')} failed:\n${stdout}${stderr}`);
  }

  return stdout;
};

/*** Finds the one candidate artifact generated for the external consumer. */
const findPackedTarballAsync = async (directory: string): Promise<string> => {
  const packedTarballs = await Array.fromAsync(new Bun.Glob('*.tgz').scan({ cwd: directory }));
  const packedTarball = packedTarballs.at(0);

  if (packedTarball === undefined) throw new Error('bun pm pack did not return a tarball.');

  return packedTarball;
};
