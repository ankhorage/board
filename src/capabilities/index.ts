import type { Capability } from '@ankhorage/contracts/capabilities';

/*** Publish Board's canonical executable capabilities for Ankh discovery and bindings. */
export const CAPABILITIES = [
  {
    id: 'board.web.import',
    owner: '@ankhorage/board',
    access: [
      'invoke'
    ],
    binding: {
      kind: 'action',
      bindableAs: [
        'target'
      ]
    },
    label: 'Import website',
    description: 'Inspect a public website URL and emit a deterministic boarding plan.'
  },
  {
    id: 'board.openapi.import',
    owner: '@ankhorage/board',
    access: [
      'invoke'
    ],
    binding: {
      kind: 'action',
      bindableAs: [
        'target'
      ]
    },
    label: 'Import OpenAPI',
    description: 'Board an OpenAPI source through the package-owned import command.'
  },
  {
    id: 'board.manifest.generate',
    owner: '@ankhorage/board',
    access: [
      'invoke'
    ],
    binding: {
      kind: 'action',
      bindableAs: [
        'target'
      ]
    },
    label: 'Generate manifest',
    description: 'Generate an Ankhorage manifest from a boarded source.'
  }
] as const satisfies readonly Capability[];
