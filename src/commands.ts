import type {
  AnkhCapabilityId,
  AnkhCommandDescriptor,
} from "@ankhorage/contracts/cli";

import type { BoardCliContext, BoardCliRunResult } from "./cli.js";

type BoardCommandPath = readonly [string] | readonly ["manifest", "generate"];

interface BoardCommandDefinition {
  readonly path: BoardCommandPath;
  readonly capability: AnkhCapabilityId;
  readonly summary: string;
}

interface ResolvedBoardCommand {
  readonly command: BoardCommandDefinition;
  readonly argv: readonly string[];
}

const DEFERRED_NOTE =
  "Real boarding/import behavior is deferred to ankhorage/board#2.";

export const BOARD_COMMANDS = [
  {
    path: ["web"],
    capability: "board.web.import",
    summary: "Board a website source through an explicit bootstrap stub.",
  },
  {
    path: ["openapi"],
    capability: "board.openapi.import",
    summary: "Board an OpenAPI source through an explicit bootstrap stub.",
  },
  {
    path: ["manifest", "generate"],
    capability: "board.manifest.generate",
    summary:
      "Generate a manifest from a boarded source through an explicit bootstrap stub.",
  },
] as const satisfies readonly BoardCommandDefinition[];

export function createProviderManifestCommands(): readonly AnkhCommandDescriptor[] {
  return BOARD_COMMANDS.map((command) => ({
    path: command.path,
    capability: command.capability,
    summary: command.summary,
  }));
}

export function createProviderHandlers() {
  return BOARD_COMMANDS.map((command) => ({
    path: command.path,
    handler: (request: {
      readonly argv: readonly string[];
      readonly context: BoardCliContext;
    }) => runBoardCommand(command, request.argv, request.context),
  }));
}

export function resolveBoardCommand(
  argv: readonly string[],
): ResolvedBoardCommand | null {
  const sorted = [...BOARD_COMMANDS].sort(
    (left, right) => right.path.length - left.path.length,
  );

  for (const command of sorted) {
    if (matchesPath(command.path, argv)) {
      return {
        command,
        argv: argv.slice(command.path.length),
      };
    }
  }

  return null;
}

export function runBoardCommand(
  command: BoardCommandDefinition,
  argv: readonly string[],
  context: BoardCliContext,
): BoardCliRunResult {
  const source = readExactSourceArg(argv);
  if (source === null) {
    context.writeStderr(renderUsageError(command));
    return { exitCode: 1 };
  }

  context.writeStdout(
    [
      `command: board ${command.path.join(" ")}`,
      `source: ${source}`,
      "status: bootstrap stub",
      `note: ${DEFERRED_NOTE}`,
      "",
    ].join("\n"),
  );

  return { exitCode: 0 };
}

function matchesPath(
  path: readonly string[],
  argv: readonly string[],
): boolean {
  if (argv.length < path.length) {
    return false;
  }

  return path.every((segment, index) => argv[index] === segment);
}

function readExactSourceArg(argv: readonly string[]): string | null {
  if (argv.length !== 1) {
    return null;
  }

  const [source] = argv;
  if (source === undefined) {
    return null;
  }

  return source.trim().length > 0 ? source : null;
}

function renderUsageError(command: BoardCommandDefinition): string {
  return [
    `Usage: ankhorage-board ${command.path.join(" ")} <source>`,
    "Each bootstrap command currently requires exactly one non-empty source argument.",
    "",
  ].join("\n");
}
