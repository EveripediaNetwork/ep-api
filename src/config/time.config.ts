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
  CACHE: {
    THIRTY_SECONDS: 30,
    ONE_MINUTE: 60,
    THREE_MINUTES: 180,
    FIVE_MINUTES: 300,
    SIX_MINUTES: 360,
    FIFTEEN_MINUTES: 900,
    THIRTY_MINUTES: 1800,
    ONE_HOUR: 3600,
    TWO_HOURS: 7200,
  },
} as const

export type TimeConfig = typeof TIME_CONFIG
