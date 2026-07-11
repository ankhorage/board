import { createKnipConfig } from "@ankhorage/devtools/knip";

export default createKnipConfig({
  entry: ["src/cli/index.ts"],
  ignoreFiles: [
    "eslint.config.mjs",
    "paradox.config.ts",
    "src/readme-usage.ts",
  ],
});
