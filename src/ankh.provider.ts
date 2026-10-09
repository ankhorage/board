import type { AnkhRuntimeCommandProvider } from '@ankhorage/ankh';

import packageJson from '../package.json';
import { CAPABILITIES } from './capabilities/index.js';
import { createProviderHandlers, createProviderManifestCommands } from './commands.js';
import { createProviderPlanningHandlers } from './planning.js';

const provider = {
  id: '@ankhorage/board',
  category: 'board',
  version: packageJson.version,
  capabilities: CAPABILITIES,
  commands: createProviderManifestCommands(),
  handlers: createProviderHandlers(),
  planningHandlers: createProviderPlanningHandlers(),
} satisfies AnkhRuntimeCommandProvider;

export default provider;
