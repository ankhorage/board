import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import packageJson from "../package.json";
import { runCli } from "../src/cli/index.js";
import {
  createBufferedContext,
  createStubBoardCommandServices,
} from "./testSupport.js";

describe("runCli", () => {
  it("prints help with no arguments", async () => {
    const context = createBufferedContext();
    const result = await runCli([], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toContain("ankhorage-board web <url>");
    expect(context.stdout).toContain("ankhorage-board openapi <source>");
    expect(context.stdout).toContain(
      "ankhorage-board manifest generate <source>",
    );
  });

  it("prints help for help aliases", async () => {
    const context = createBufferedContext();
    const result = await runCli(["--help"], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toContain(
      "The website-source pipeline is currently implemented only for `web`.",
    );
  });

  it("prints the package version", async () => {
    const context = createBufferedContext({ version: packageJson.version });
    const result = await runCli(["--version"], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toBe(`${packageJson.version}\n`);
  });

  it("dispatches web through the shared runner", async () => {
    const services = createStubBoardCommandServices(() =>
      Promise.resolve({
        exitCode: 0,
        plan: {
          app: {
            suggestedName: "Example Domain",
            suggestedSlug: "example-domain",
          },
          diagnostics: [],
          kind: "web-boarding-plan",
          observedLinks: [],
          routes: [
            {
              description: "Fixture route",
              headings: ["Example Domain"],
              path: "/",
              sections: ["Hero"],
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
        },
      }),
    );
    const context = createBufferedContext({
      services,
      version: packageJson.version,
    });
    const result = await runCli(["web", "https://example.com"], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toContain('"kind": "web-boarding-plan"');
    expect(context.stdout).toContain('"url": "https://example.com/"');
  });

  it("dispatches openapi through the shared runner", async () => {
    const context = createBufferedContext();
    const result = await runCli(["openapi", "./openapi.json"], context);

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toContain("command: board openapi");
    expect(context.stdout).toContain("source: ./openapi.json");
  });

  it("dispatches manifest generate through the shared runner", async () => {
    const context = createBufferedContext();
    const result = await runCli(
      ["manifest", "generate", "website-source"],
      context,
    );

    expect(result.exitCode).toBe(0);
    expect(context.stdout).toContain("command: board manifest generate");
    expect(context.stdout).toContain("source: website-source");
  });

  it("rejects missing website URL", async () => {
    const context = createBufferedContext();
    const result = await runCli(["web"], context);

    expect(result.exitCode).toBe(1);
    expect(context.stdout).toBe("");
    expect(context.stderr).toContain(
      "Usage: ankhorage-board web <url> [--plan] [--create <project>]",
    );
  });

  it("rejects invalid website URLs", async () => {
    const context = createBufferedContext();
    const result = await runCli(["web", "example.com"], context);

    expect(result.exitCode).toBe(1);
    expect(context.stdout).toBe("");
    expect(context.stderr).toContain(
      "board web requires a syntactically valid absolute website URL.",
    );
  });

  it("rejects unsupported schemes", async () => {
    const context = createBufferedContext();
    const result = await runCli(["web", "file:///tmp/example"], context);

    expect(result.exitCode).toBe(1);
    expect(context.stdout).toBe("");
    expect(context.stderr).toContain(
      "board web supports only absolute http:// or https:// website URLs.",
    );
  });

  it("rejects extra positional arguments", async () => {
    const context = createBufferedContext();
    const result = await runCli(
      ["web", "https://example.com", "extra"],
      context,
    );

    expect(result.exitCode).toBe(1);
    expect(context.stdout).toBe("");
    expect(context.stderr).toContain(
      "board web accepts exactly one URL and optional flags `--plan` or `--create <project>`.",
    );
  });

  it("rejects unsupported flags", async () => {
    const context = createBufferedContext();
    const result = await runCli(
      ["web", "https://example.com", "--json"],
      context,
    );

    expect(result.exitCode).toBe(1);
    expect(context.stdout).toBe("");
    expect(context.stderr).toContain("Unsupported board web flag: --json");
  });

  it("returns deferred stderr for --create", async () => {
    const context = createBufferedContext();
    const result = await runCli(
      ["web", "https://example.com", "--create", "my-app"],
      context,
    );

    expect(result.exitCode).toBe(1);
    expect(context.stdout).toBe("");
    expect(context.stderr).toContain(
      "Project creation from a web boarding plan is deferred.",
    );
  });

  it("keeps unknown top-level commands generic", async () => {
    const context = createBufferedContext();
    const result = await runCli(["https://example.com"], context);

    expect(result.exitCode).toBe(1);
    expect(context.stderr).toContain(
      "Unknown board command: https://example.com",
    );
    expect(context.stderr).toContain("ankhorage-board --help");
  });
});

describe("package-scoped CLI commands", () => {
  const fixturePath = join(import.meta.dir, "fixtures", "example-com.html");
  const cwd = import.meta.dir.replace(/\/test$/, "");

  it("covers `bun src/cli/index.ts web https://example.com`", () => {
    const result = Bun.spawnSync(
      [process.execPath, "src/cli/index.ts", "web", "https://example.com"],
      {
        cwd,
        env: {
          ...process.env,
          ANKHORAGE_BOARD_TEST_WEB_FIXTURE_PATH: fixturePath,
          ANKHORAGE_BOARD_TEST_WEB_FIXTURE_RESPONSE_URL: "https://example.com/",
        },
        stderr: "pipe",
        stdout: "pipe",
      },
    );

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain('"kind": "web-boarding-plan"');
    expect(stdout).toContain('"url": "https://example.com/"');
  });

  it("covers `bun src/cli/index.ts web https://example.com --plan` and keeps output identical", () => {
    const env = {
      ...process.env,
      ANKHORAGE_BOARD_TEST_WEB_FIXTURE_PATH: fixturePath,
      ANKHORAGE_BOARD_TEST_WEB_FIXTURE_RESPONSE_URL: "https://example.com/",
    };

    const withoutPlan = Bun.spawnSync(
      [process.execPath, "src/cli/index.ts", "web", "https://example.com"],
      {
        cwd,
        env,
        stderr: "pipe",
        stdout: "pipe",
      },
    );
    const withPlan = Bun.spawnSync(
      [
        process.execPath,
        "src/cli/index.ts",
        "web",
        "https://example.com",
        "--plan",
      ],
      {
        cwd,
        env,
        stderr: "pipe",
        stdout: "pipe",
      },
    );

    expect(withoutPlan.exitCode).toBe(0);
    expect(withPlan.exitCode).toBe(0);
    expect(withPlan.stdout.toString()).toBe(withoutPlan.stdout.toString());
  });
});
