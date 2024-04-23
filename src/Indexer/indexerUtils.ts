export interface CommandOptions {
  unixtime: number
  loop: boolean
  ipfsTime: boolean
  mode: string
}

export const SLEEP_TIME = 4000
export const SLEEP_TIME_QUERY = 3000

export const TWENTY_FOUR_HOURS_AGO =
  Math.floor(new Date().getTime() / 1000) - 86400
