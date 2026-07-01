import { createKnipConfig } from "@ankhorage/devtools/knip";

export default createKnipConfig({
  ignoreFiles: [
    "eslint.config.mjs",
    "paradox.config.ts",
    "src/readme-usage.ts",
  ],
});
