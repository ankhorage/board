#!/usr/bin/env bun

import packageJson from "../package.json";
import {
  BOARD_COMMANDS,
  resolveBoardCommand,
  runBoardCommand,
} from "./commands.js";

export interface BoardCliContext {
  readonly cwd: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly version: string;
  writeStdout(text: string): void;
  writeStderr(text: string): void;
}

export interface BoardCliRunResult {
  readonly exitCode: number;
}

export function createDefaultBoardCliContext(): BoardCliContext {
  return {
    cwd: process.cwd(),
    env: process.env,
    version: packageJson.version,
    writeStdout(text: string) {
      process.stdout.write(text);
    },
    writeStderr(text: string) {
      process.stderr.write(text);
    },
  };
}

export function runCli(
  argv: readonly string[],
  context: BoardCliContext = createDefaultBoardCliContext(),
): BoardCliRunResult {
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

  return runBoardCommand(
    resolvedCommand.command,
    resolvedCommand.argv,
    context,
  );
}

export function renderHelp(): string {
  const commandLines = BOARD_COMMANDS.map(
    (command) => `  ankhorage-board ${command.path.join(" ")} <source>`,
  );
  return [
    "@ankhorage/board",
    "",
    "Bootstrap Ankh provider and standalone CLI for boarding external sources.",
    "",
    "Usage:",
    ...commandLines,
    "  ankhorage-board --help",
    "  ankhorage-board --version",
    "",
    "Current commands are explicit only. Bare URL shortcuts are deferred.",
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
  const result = runCli(process.argv.slice(2));
  process.exit(result.exitCode);
}
