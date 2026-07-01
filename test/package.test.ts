import type { AnkhPackageMetadata } from "@ankhorage/contracts/cli";
import { describe, expect, it } from "bun:test";

import packageJson from "../package.json";

describe("package metadata", () => {
  it("publishes the expected package shape", () => {
    expect(packageJson.name).toBe("@ankhorage/board");
    expect(packageJson.type).toBe("module");
    expect(packageJson.bin).toEqual({
      "ankhorage-board": "./dist/cli.js",
    });
    expect(packageJson.exports).toEqual({
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
      "./package.json": "./package.json",
    });
  });

  it("publishes exact Ankh package metadata", () => {
    const expectedAnkhMetadata = {
      category: "board",
      provider: "./dist/ankh.provider.js",
      capabilities: [
        "board.web.import",
        "board.openapi.import",
        "board.manifest.generate",
      ],
    } satisfies AnkhPackageMetadata;

    expect(packageJson.ankh).toEqual({
      ...expectedAnkhMetadata,
      capabilities: [...expectedAnkhMetadata.capabilities],
    });
  });

  it("exposes the required scripts for public Ankh packages", () => {
    const requiredScripts = [
      "build",
      "typecheck",
      "lint",
      "lint:fix",
      "format",
      "format:check",
      "test",
      "knip",
      "docs",
      "changeset",
      "changeset:status",
      "version-packages",
    ] as const;

    for (const script of requiredScripts) {
      expect(typeof packageJson.scripts[script]).toBe("string");
    }
  });
});
