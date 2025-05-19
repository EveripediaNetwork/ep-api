export const ENDPOINTS_CONFIG = {
  IGNORED: ['/brainpass/nft-events', '/indexer'],
} as const

export type EndpointsConfig = typeof ENDPOINTS_CONFIG
