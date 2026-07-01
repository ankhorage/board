import type { BoardCliContext } from "../src/cli.js";

export interface BufferedContext extends BoardCliContext {
  readonly stdout: string;
  readonly stderr: string;
}

export function createBufferedContext(): BufferedContext {
  let stdout = "";
  let stderr = "";

  return {
    cwd: "/tmp/board-test",
    env: {},
    version: "0.0.0",
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
