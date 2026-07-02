import { join } from "node:path";

import type {
  AnkhCommandContext,
  AnkhDiscoveredPackage,
  AnkhLoadedProvider,
} from "@ankhorage/ankh";
import { runCli } from "@ankhorage/ankh";
import { describe, expect, it } from "bun:test";

import packageJson from "../package.json";
import provider from "../src/ankh.provider.js";

interface BufferedAnkhContext extends AnkhCommandContext {
  readonly stdout: string;
  readonly stderr: string;
}

const fixturePath = join(import.meta.dir, "fixtures", "example-com.html");

function createBufferedAnkhContext(
  env: Readonly<Record<string, string | undefined>> = {},
): BufferedAnkhContext {
  let stdout = "";
  let stderr = "";

  return {
    cwd: "/tmp/board-planning-test",
    env,
    version: "0.0.0-test",
    get stdout() {
      return stdout;
    },
    get stderr() {
      return stderr;
    },
    writeStdout(text: string) {
      stdout += text;
    },
    writeStderr(text: string) {
      stderr += text;
    },
  };
}

function createDiscoveredPackage(): AnkhDiscoveredPackage {
  return {
    metadata: packageJson.ankh,
    packageJsonPath: "/repo/@ankhorage/board/package.json",
    packageName: "@ankhorage/board",
    packageRoot: "/repo/@ankhorage/board",
    source: "workspace",
  };
}

function createLoadedProvider(
  providerModuleDefaultExport: unknown = provider,
): AnkhLoadedProvider {
  const discoveredPackage = createDiscoveredPackage();

  return {
    discoveredPackage,
    manifest: provider,
    providerModuleDefaultExport,
    providerModulePath: `${discoveredPackage.packageRoot}/dist/ankh.provider.js`,
    providerModuleUrl: `file://${discoveredPackage.packageRoot}/dist/ankh.provider.js`,
  };
}

function createRootRunOptions(providerModuleDefaultExport: unknown = provider) {
  return {
    discoverPackages: () =>
      Promise.resolve({
        diagnostics: [],
        packages: [createDiscoveredPackage()],
      }),
    loadProviders: () =>
      Promise.resolve({
        diagnostics: [],
        providers: [createLoadedProvider(providerModuleDefaultExport)],
      }),
  };
}

function createFixtureEnv(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Readonly<Record<string, string | undefined>> {
  return {
    ANKHORAGE_BOARD_TEST_WEB_FIXTURE_PATH: fixturePath,
    ANKHORAGE_BOARD_TEST_WEB_FIXTURE_RESPONSE_URL: "https://example.com/",
    ...overrides,
  };
}

describe("board provider planning", () => {
  it("exposes execution and planning handlers", () => {
    expect(provider.handlers).toBeDefined();
    expect(provider.planningHandlers).toBeDefined();
    expect(provider.planningHandlers?.map((binding) => binding.path)).toEqual([
      ["web"],
    ]);
  });

  it("returns a deterministic human-readable root plan for board web", async () => {
    const context = createBufferedAnkhContext(createFixtureEnv());

    const result = await runCli(
      ["plan", "board", "web", "https://example.com"],
      {
        context,
        ...createRootRunOptions(),
      },
    );

    expect(result).toEqual({ exitCode: 0 });
    expect(context.stdout).toContain(
      "Plan: Board website source: https://example.com/",
    );
    expect(context.stdout).toContain("1. Inspect website source");
    expect(context.stdout).toContain("2. Draft Ankhorage project manifest");
    expect(context.stdout).toContain("destructive: no");
    expect(context.stderr).toBe("");
  });

  it("returns stable root plan JSON for board web", async () => {
    const context = createBufferedAnkhContext(createFixtureEnv());

    const result = await runCli(
      ["plan", "board", "web", "https://example.com", "--json"],
      {
        context,
        ...createRootRunOptions(),
      },
    );

    const commandPlan = JSON.parse(context.stdout) as {
      readonly diagnostics: readonly unknown[];
      readonly kind: string;
      readonly steps: readonly [
        { readonly outputs: { readonly routes: readonly [{ readonly title: string }] } },
        { readonly outputs: { readonly suggestedSlug: string } },
      ];
      readonly title: string;
      readonly version: number;
    };

    expect(result).toEqual({ exitCode: 0 });
    expect(commandPlan.kind).toBe("ankh-command-plan");
    expect(commandPlan.version).toBe(1);
    expect(commandPlan.title).toBe(
      "Board website source: https://example.com/",
    );
    expect(commandPlan.diagnostics).toEqual([]);
    expect(commandPlan.steps[0].outputs.routes[0].title).toBe(
      "Example Domain",
    );
    expect(commandPlan.steps[1].outputs.suggestedSlug).toBe("example-domain");
    expect(context.stderr).toBe("");
  });

  it("does not call execution handlers while planning", async () => {
    const context = createBufferedAnkhContext(createFixtureEnv());
    let executed = false;
    const providerWithTrackedExecutionHandlers = {
      ...provider,
      handlers: provider.handlers?.map((binding) => ({
        path: binding.path,
        handler() {
          executed = true;
        },
      })),
    };

    const result = await runCli(
      ["plan", "board", "web", "https://example.com"],
      {
        context,
        ...createRootRunOptions(providerWithTrackedExecutionHandlers),
      },
    );

    expect(result).toEqual({ exitCode: 0 });
    expect(executed).toBeFalse();
    expect(context.stdout).toContain("Plan: Board website source");
    expect(context.stderr).toBe("");
  });

  it("returns plan diagnostics for unsupported websites", async () => {
    const context = createBufferedAnkhContext(
      createFixtureEnv({
        ANKHORAGE_BOARD_TEST_WEB_FIXTURE_CONTENT_TYPE: "application/json",
      }),
    );

    const result = await runCli(
      ["plan", "board", "web", "https://example.com", "--json"],
      {
        context,
        ...createRootRunOptions(),
      },
    );

    const commandPlan = JSON.parse(context.stdout) as {
      readonly diagnostics: readonly [{ readonly code: string }];
      readonly steps: readonly [
        { readonly status: string },
        { readonly status: string },
      ];
    };

    expect(result).toEqual({ exitCode: 1 });
    expect(commandPlan.diagnostics[0].code).toBe(
      "website-unsupported-content-type",
    );
    expect(commandPlan.steps[0].status).toBe("blocked");
    expect(commandPlan.steps[1].status).toBe("blocked");
    expect(context.stderr).toBe("");
  });
});
