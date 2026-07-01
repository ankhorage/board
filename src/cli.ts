#!/usr/bin/env bun

import packageJson from "../package.json";
import { resolveBoardCommand, runBoardCommand } from "./commands.js";
import {
  type BoardCommandServices,
  createDefaultBoardCommandServices,
} from "./commandServices.js";

export interface BoardCliContext {
  readonly cwd: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly services?: BoardCommandServices;
  readonly version: string;
  writeStdout(text: string): void;
  writeStderr(text: string): void;
}

export interface BoardCliRunResult {
  readonly exitCode: number;
}

export function createDefaultBoardCliContext(): BoardCliContext {
  const { env } = process;

  return {
    cwd: process.cwd(),
    env,
    services: createDefaultBoardCommandServices(env),
    version: packageJson.version,
    writeStdout(text: string) {
      process.stdout.write(text);
    },
    writeStderr(text: string) {
      process.stderr.write(text);
    },
  };
}

export async function runCli(
  argv: readonly string[],
  context: BoardCliContext = createDefaultBoardCliContext(),
): Promise<BoardCliRunResult> {
  const [firstToken] = argv;

  if (
    firstToken === undefined ||
    firstToken === "--help" ||
    firstToken === "-h" ||
    firstToken === "help"
  ) {
    context.writeStdout(renderHelp());
    return { exitCode: 0 };
  }

  if (firstToken === "--version" || firstToken === "-v") {
    context.writeStdout(`${context.version}\n`);
    return { exitCode: 0 };
  }

  const resolvedCommand = resolveBoardCommand(argv);
  if (resolvedCommand === null) {
    context.writeStderr(renderUnknownCommand(argv));
    return { exitCode: 1 };
  }

  return await runBoardCommand(
    resolvedCommand.command,
    resolvedCommand.argv,
    context,
  );
}

export function renderHelp(): string {
  return [
    "@ankhorage/board",
    "",
    "Ankh provider and standalone CLI for boarding external website sources.",
    "",
    "Usage:",
    "  ankhorage-board web <url>",
    "  ankhorage-board web <url> --plan",
    "  ankhorage-board web <url> --create <project>",
    "  ankhorage-board openapi <source>",
    "  ankhorage-board manifest generate <source>",
    "  ankhorage-board --help",
    "  ankhorage-board --version",
    "",
    "The website-source pipeline is currently implemented only for `web`.",
    "OpenAPI import, standalone manifest generation, project creation, and bare URL shortcuts are deferred.",
    "",
  ].join("\n");
}

function renderUnknownCommand(argv: readonly string[]): string {
  const input = argv.join(" ").trim();
  return [
    `Unknown board command: ${input.length > 0 ? input : "(none)"}`,
    "Try:",
    "  ankhorage-board --help",
    "",
  ].join("\n");
}

if (import.meta.main) {
  const result = await runCli(process.argv.slice(2));
  process.exit(result.exitCode);
}
