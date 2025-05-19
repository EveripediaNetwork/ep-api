export const API_CONFIG = {
  COINGECKO: {
    BASE_URL: 'https://www.coingecko.com/en',
    API_URL: 'https://pro-api.coingecko.com/api/v3/',
    PROFILE_URL: (category: string) =>
      `${API_CONFIG.COINGECKO.BASE_URL}/${
        category === 'cryptocurrencies' ? 'coins' : 'nft'
      }`,
  },
} as const

export type ApiConfig = typeof API_CONFIG
