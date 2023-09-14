export const SUPPORTED_LP_TOKENS_ADDRESSES = [
  '0x7af00cf8d3a8a75210a5ed74f2254e2ec43b5b5b',
  '0x41a5881c17185383e19df6fa4ec158a6f4851a69:32',
  '0x3835a58ca93cdb5f912519ad366826ac9a752510',
  '0x49b4d1df40442f0c31b1bbaea3ede7c38e37e31a',
]

export type ContractDetailsType = {
  name: string
  price: number
  symbol: string
  id: string
  raw_amount_hex_str: string
  amount: number
  protocol_id: string
}

export type TreasuryTokenType = {
  contractAddress: string
  token: number | { amount: number; symbol: string }[]
  raw_dollar: number
  id: string
}

export enum Protocols {
  ETH = 'eth',
  FRAX = 'frax',
  CONVEX = 'convex',
  FRAXLEND = 'fraxlend',
  APESTAKE = 'apestake',
}

export const TOKEN_MINIMUM_VALUE = 1000


export const PROTOCOLS = ['frax', 'convex', 'fraxlend']
export const TOKENS = [
  '0x579cea1889991f68acc35ff5c3dd0621ff29b0c9',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  '0x853d955acef822db058eb8505911ed77f175b99e',
  '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0',
  '0x9d45081706102e7aaddd0973268457527722e274',
  '0xac3e018457b222d93114458476f3e3416abbe38f',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  '0x7af00cf8d3a8a75210a5ed74f2254e2ec43b5b5b',
  '0x4d224452801aced8b2f0aebe155379bb5d594381',
  '0x41a5881c17185383e19df6fa4ec158a6f4851a69',
  '0x3835a58ca93cdb5f912519ad366826ac9a752510',
  '0x49b4d1df40442f0c31b1bbaea3ede7c38e37e31a',
]

export const todayMidnightDate = new Date(new Date().setHours(0, 0, 0, 0))

export const oneYearAgo = 1658275200 // 2022 July 20

export const dateOnly = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return `${year}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`
}

export const firstLevelNodeProcess = () =>
  parseInt(process.env.NODE_APP_INSTANCE as string, 10) === 0
