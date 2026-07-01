import { describe, expect, it } from "bun:test";

import {
  BOARD_COMMANDS,
  resolveBoardCommand,
  runBoardCommand,
} from "../src/commands.js";
import { renderWebBoardingPlan } from "../src/webInspection.js";
import {
  createBufferedContext,
  createStubBoardCommandServices,
} from "./testSupport.js";

describe("BOARD_COMMANDS", () => {
  it("locks the exact command surface and capabilities", () => {
    expect(BOARD_COMMANDS).toEqual([
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
  it("prints deferred stub output for openapi", async () => {
    const context = createBufferedContext();
    const result = await runBoardCommand(
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
        "note: This command surface remains deferred beyond ankhorage/board#2.",
        "",
      ].join("\n"),
    );
  });

  it("prints plan JSON for a valid website URL", async () => {
    const expectedPlan = {
      app: {
        suggestedName: "Example Domain",
        suggestedSlug: "example-domain",
      },
      diagnostics: [],
      kind: "web-boarding-plan",
      observedLinks: [],
      routes: [
        {
          headings: [],
          path: "/",
          sections: [],
          sourceUrl: "https://example.com/",
          title: "Example Domain",
        },
      ],
      source: {
        fetchedUrl: "https://example.com/",
        kind: "website",
        url: "https://example.com/",
      },
      version: 1,
    } as const;
    const services = createStubBoardCommandServices(() =>
      Promise.resolve({
        exitCode: 0,
        plan: expectedPlan,
      }),
    );
    const context = createBufferedContext({ services });

    const result = await runBoardCommand(
      BOARD_COMMANDS[0],
      ["https://example.com"],
      context,
    );

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toBe(renderWebBoardingPlan(expectedPlan));
    expect(context.stderr).toBe("");
  });

  it("returns deferred stderr for --create", async () => {
    const context = createBufferedContext();

    const result = await runBoardCommand(
      BOARD_COMMANDS[0],
      ["https://example.com", "--create", "my-app"],
      context,
    );

    expect(result.exitCode).toBe(1);
    expect(context.stdout).toBe("");
    expect(context.stderr).toContain(
      "Project creation from a web boarding plan is deferred.",
    );
  });
});
