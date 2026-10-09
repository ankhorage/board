import type { Capability } from '@ankhorage/contracts/capability';

/*** Publish Board's canonical catalog of executable package capabilities. */
export const CAPABILITIES = [
  {
    id: 'board.web.import',
    owner: '@ankhorage/board',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Import website source',
    description: 'Inspect a public website URL and emit a deterministic boarding plan.',
  },
  {
    id: 'board.openapi.import',
    owner: '@ankhorage/board',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Import OpenAPI source',
    description: 'Board an OpenAPI source through an explicit bootstrap stub.',
  },
  {
    id: 'board.manifest.generate',
    owner: '@ankhorage/board',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Generate boarding manifest',
    description: 'Generate a manifest from a boarded source through an explicit bootstrap stub.',
  },
] as const satisfies readonly Capability[];
