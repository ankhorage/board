import { describe, expect, it } from "bun:test";

import { runCli } from "../src/cli.js";
import { createBufferedContext } from "./testSupport.js";

describe("runCli", () => {
  it("prints help with no arguments", () => {
    const context = createBufferedContext();
    const result = runCli([], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toContain("ankhorage-board web <source>");
    expect(context.stdout).toContain("ankhorage-board openapi <source>");
    expect(context.stdout).toContain(
      "ankhorage-board manifest generate <source>",
    );
  });

  it("prints help for help aliases", () => {
    const context = createBufferedContext();
    const result = runCli(["--help"], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toContain("Current commands are explicit only.");
  });

  it("prints the package version", () => {
    const context = createBufferedContext();
    const result = runCli(["--version"], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toBe("0.0.0\n");
  });

  it("dispatches web through the shared runner", () => {
    const context = createBufferedContext();
    const result = runCli(["web", "https://example.com"], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toContain("command: board web");
    expect(context.stdout).toContain("source: https://example.com");
    expect(context.stdout).toContain("status: bootstrap stub");
  });

  it("dispatches openapi through the shared runner", () => {
    const context = createBufferedContext();
    const result = runCli(["openapi", "./openapi.json"], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toContain("command: board openapi");
    expect(context.stdout).toContain("source: ./openapi.json");
  });

  it("dispatches manifest generate through the shared runner", () => {
    const context = createBufferedContext();
    const result = runCli(["manifest", "generate", "website-source"], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toContain("command: board manifest generate");
    expect(context.stdout).toContain("source: website-source");
  });

  it("rejects missing source arguments", () => {
    const context = createBufferedContext();
    const result = runCli(["web"], context);

    expect(result.exitCode).toBe(1);
    expect(context.stderr).toContain("Usage: ankhorage-board web <source>");
  });

  it("rejects blank source arguments", () => {
    const context = createBufferedContext();
    const result = runCli(["openapi", "   "], context);

    expect(result.exitCode).toBe(1);
    expect(context.stderr).toContain("exactly one non-empty source argument");
  });

  it("rejects extra source arguments", () => {
    const context = createBufferedContext();
    const result = runCli(["manifest", "generate", "one", "two"], context);

    expect(result.exitCode).toBe(1);
    expect(context.stderr).toContain(
      "Usage: ankhorage-board manifest generate <source>",
    );
  });

  it("does not support bare source shorthand", () => {
    const context = createBufferedContext();
    const result = runCli(["https://example.com"], context);

    expect(result.exitCode).toBe(1);
    expect(context.stderr).toContain(
      "Unknown board command: https://example.com",
    );
    expect(context.stderr).toContain("ankhorage-board --help");
  });
});
