export const LISTS_CONFIG = {
  RANK: {
    DEFAULT: 'default-list',
    STABLECOINS: 'stablecoins-list',
    AI_COINS: 'ai-coins-list',
    NFT: 'nft-list',
  },
} as const

export type ListsConfig = typeof LISTS_CONFIG
