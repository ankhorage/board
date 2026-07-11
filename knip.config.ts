import { createKnipConfig } from "@ankhorage/devtools/knip";

export default createKnipConfig({
  entry: ["src/index.ts", "src/ankh.provider.ts", "src/cli/index.ts"],
  ignoreFiles: [
    "eslint.config.mjs",
    "paradox.config.ts",
    "src/readme-usage.ts",
  ],
});
