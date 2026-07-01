import type { BoardCliContext } from "../src/cli.js";
import type { BoardCommandServices } from "../src/commandServices.js";

export interface BufferedContext extends BoardCliContext {
  readonly stdout: string;
  readonly stderr: string;
}

export function createBufferedContext(
  overrides: Partial<
    Pick<BoardCliContext, "cwd" | "env" | "services" | "version">
  > = {},
): BufferedContext {
  let stdout = "";
  let stderr = "";

  return {
    cwd: overrides.cwd ?? "/tmp/board-test",
    env: overrides.env ?? {},
    services: overrides.services ?? createStubBoardCommandServices(),
    version: overrides.version ?? "0.0.0",
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

export function createStubBoardCommandServices(
  implementation: BoardCommandServices["inspectWebsite"] = ({ url }) =>
    Promise.resolve({
      exitCode: 0,
      plan: {
        app: {
          suggestedName: "Stub",
          suggestedSlug: "stub",
        },
        diagnostics: [],
        kind: "web-boarding-plan",
        observedLinks: [],
        routes: [
          {
            headings: [],
            path: new URL(url).pathname || "/",
            sections: [],
            sourceUrl: url,
          },
        ],
        source: {
          kind: "website",
          url,
        },
        version: 1,
      },
    }),
): BoardCommandServices {
  return {
    inspectWebsite: implementation,
  };
}
