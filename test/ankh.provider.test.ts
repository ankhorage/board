import type { AnkhRuntimeCommandProvider } from "@ankhorage/ankh";
import { describe, expect, it } from "bun:test";

import packageJson from "../package.json";
import provider from "../src/ankh.provider.js";
import { BOARD_COMMANDS, runBoardCommand } from "../src/commands.js";
import { createBufferedContext } from "./testSupport.js";

describe("board provider", () => {
  it("exports the expected provider metadata", () => {
    expect(provider.id).toBe("@ankhorage/board");
    expect(provider.category).toBe("board");
    expect(provider.version).toBe(packageJson.version);
    expect(provider.capabilities).toEqual([
      "board.web.import",
      "board.openapi.import",
      "board.manifest.generate",
    ]);
  });

  it("matches the runtime provider shape", () => {
    const typedProvider = provider satisfies AnkhRuntimeCommandProvider;
    expect(typedProvider.commands.length).toBe(3);
    expect(typedProvider.handlers.length).toBe(3);
  });

  it("derives command descriptors directly from the shared command table", () => {
    expect(provider.commands).toEqual(
      BOARD_COMMANDS.map((command) => ({
        path: command.path,
        capability: command.capability,
        summary: command.summary,
      })),
    );
  });

  it("keeps handlers and descriptors in exact one-to-one alignment", () => {
    const commandsByPath = new Set(
      provider.commands.map((command) => command.path.join(" ")),
    );
    const { handlers } = provider;
    const handlersByPath = new Set(
      handlers.map((handler) => handler.path.join(" ")),
    );

    expect(commandsByPath).toEqual(handlersByPath);
    expect(commandsByPath.size).toBe(provider.commands.length);
    expect(handlersByPath.size).toBe(handlers.length);
  });

  it("delegates provider handlers to the shared runner", async () => {
    const handler = provider.handlers.find(
      (entry) => entry.path.join(" ") === "web",
    )?.handler;
    expect(handler).toBeDefined();
    if (handler === undefined) return;

    const providerContext = createBufferedContext();
    const providerResult = await handler({
      argv: ["https://example.com"],
      context: providerContext,
    });

    const directContext = createBufferedContext();
    const directResult = await runBoardCommand(
      BOARD_COMMANDS[0],
      ["https://example.com"],
      directContext,
    );

    expect(providerResult).toEqual(directResult);
    expect(providerContext.stdout).toBe(directContext.stdout);
    expect(providerContext.stderr).toBe(directContext.stderr);
  });
});
