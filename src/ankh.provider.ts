import type { AnkhRuntimeCommandProvider } from "@ankhorage/ankh";

import packageJson from "../package.json";
import {
  BOARD_COMMANDS,
  createProviderHandlers,
  createProviderManifestCommands,
} from "./commands.js";

const provider = {
  id: "@ankhorage/board",
  category: "board",
  version: packageJson.version,
  capabilities: BOARD_COMMANDS.map((command) => command.capability),
  commands: createProviderManifestCommands(),
  handlers: createProviderHandlers(),
} satisfies AnkhRuntimeCommandProvider;

export default provider;
