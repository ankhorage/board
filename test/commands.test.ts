import { describe, expect, it } from "bun:test";

import {
  BOARD_COMMANDS,
  resolveBoardCommand,
  runBoardCommand,
} from "../src/commands.js";
import { createBufferedContext } from "./testSupport.js";

describe("BOARD_COMMANDS", () => {
  it("locks the exact command surface and capabilities", () => {
    expect(BOARD_COMMANDS).toEqual([
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
    ]);
  });

  it("does not include aliases in the bootstrap slice", () => {
    const commandKeys = BOARD_COMMANDS.map((command) => Object.keys(command));
    expect(
      commandKeys.every(
        (keys) => keys.includes("path") && !keys.includes("aliases"),
      ),
    ).toBe(true);
  });
});

describe("resolveBoardCommand", () => {
  it("resolves the longest matching command path", () => {
    expect(
      resolveBoardCommand(["manifest", "generate", "source"])?.command.path,
    ).toEqual(["manifest", "generate"]);
  });

  it("returns null for unknown commands", () => {
    expect(resolveBoardCommand(["unknown"])).toBeNull();
  });
});

describe("runBoardCommand", () => {
  it("prints deterministic stub output for valid input", () => {
    const context = createBufferedContext();
    const result = runBoardCommand(
      BOARD_COMMANDS[1],
      ["./openapi.json"],
      context,
    );

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toBe(
      [
        "command: board openapi",
        "source: ./openapi.json",
        "status: bootstrap stub",
        "note: Real boarding/import behavior is deferred to ankhorage/board#2.",
        "",
      ].join("\n"),
    );
  });
});
