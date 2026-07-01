import { defineParadoxConfig } from "@ankhorage/paradox";

export default defineParadoxConfig({
  mode: "write",
  docs: {
    title: "@ankhorage/board",
    description:
      "Bootstrap Ankh provider and standalone CLI for boarding websites and source artifacts.",
    usage: {
      entrypoints: ["src/readme-usage.ts"],
    },
  },
  package: {
    entrypoints: ["src/index.ts"],
  },
  output: {
    dir: "paradox",
  },
});
