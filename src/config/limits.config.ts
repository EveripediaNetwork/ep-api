export const LIMITS_CONFIG = {
  RANK: {
    DEFAULT: 2000,
    PAGE_SIZE: 250,
  },
  USER: {
    ACTIVITY: 150,
  },
  BATCH: {
    SIZE: 50,
  },
} as const

export type LimitsConfig = typeof LIMITS_CONFIG
