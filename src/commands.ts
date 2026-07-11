import type {
  AnkhCapabilityId,
  AnkhCommandDescriptor,
} from "@ankhorage/contracts/cli";

import type { BoardCliContext, BoardCliRunResult } from "./cli/index.js";
import { createDefaultBoardCommandServices } from "./commandServices.js";
import { renderWebBoardingPlan } from "./webInspection.js";

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
  "This command surface remains deferred beyond ankhorage/board#2.";

export const BOARD_COMMANDS = [
  {
    path: ["web"],
    capability: "board.web.import",
    summary:
      "Inspect a public website URL and emit a deterministic boarding plan.",
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
    handler: async (request: {
      readonly argv: readonly string[];
      readonly context: BoardCliContext;
    }) => await runBoardCommand(command, request.argv, request.context),
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

export async function runBoardCommand(
  command: BoardCommandDefinition,
  argv: readonly string[],
  context: BoardCliContext,
): Promise<BoardCliRunResult> {
  if (command.path[0] === "web") {
    return await runWebBoardCommand(argv, context);
  }

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

async function runWebBoardCommand(
  argv: readonly string[],
  context: BoardCliContext,
): Promise<BoardCliRunResult> {
  const parsed = parseWebCommandArgs(argv);
  if (parsed.kind === "error") {
    context.writeStderr(`${parsed.message}\n`);
    return { exitCode: 1 };
  }

  if (parsed.createProject !== null) {
    context.writeStderr(
      [
        "Project creation from a web boarding plan is deferred.",
        "Run `ankh board web <url> --plan` to inspect the generated plan.",
        "",
      ].join("\n"),
    );
    return { exitCode: 1 };
  }

  const services =
    context.services ?? createDefaultBoardCommandServices(context.env);
  const result = await services.inspectWebsite({
    url: parsed.url,
  });

  context.writeStdout(renderWebBoardingPlan(result.plan));
  return { exitCode: result.exitCode };
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
    "Each deferred command currently requires exactly one non-empty source argument.",
    "",
  ].join("\n");
}

type ParsedWebCommandArgs =
  | {
      readonly createProject: string | null;
      readonly kind: "ok";
      readonly url: string;
    }
  | {
      readonly kind: "error";
      readonly message: string;
    };

function parseWebCommandArgs(argv: readonly string[]): ParsedWebCommandArgs {
  let createProject: string | null = null;
  let sourceUrl: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }

    if (token === "--plan") {
      continue;
    }

    if (token === "--create") {
      const project = argv[index + 1];
      if (
        project === undefined ||
        project.trim().length === 0 ||
        project.startsWith("--")
      ) {
        return {
          kind: "error",
          message:
            "Usage: ankhorage-board web <url> [--plan] [--create <project>]",
        };
      }

      createProject = project;
      index += 1;
      continue;
    }

    if (token.startsWith("--")) {
      return {
        kind: "error",
        message: `Unsupported board web flag: ${token}`,
      };
    }

    if (sourceUrl !== null) {
      return {
        kind: "error",
        message:
          "board web accepts exactly one URL and optional flags `--plan` or `--create <project>`.",
      };
    }

    sourceUrl = token;
  }

  if (sourceUrl === null || sourceUrl.trim().length === 0) {
    return {
      kind: "error",
      message: "Usage: ankhorage-board web <url> [--plan] [--create <project>]",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return {
      kind: "error",
      message: "board web requires a syntactically valid absolute website URL.",
    };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      kind: "error",
      message:
        "board web supports only absolute http:// or https:// website URLs.",
    };
  }

  return {
    createProject,
    kind: "ok",
    url: parsedUrl.toString(),
  };
}
