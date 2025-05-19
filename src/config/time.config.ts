export const TIME_CONFIG = {
  SLEEP: {
    DEFAULT: 4000,
    QUERY: 3000,
  },
  DELAY: {
    DEFAULT: 2000,
  },
  BATCH: {
    SIZE: 50,
  },
} as const

export type TimeConfig = typeof TIME_CONFIG
