import { Response } from 'express'

export enum AlchemyWebhookType {
  WIKI = 'ALCHEMY_NOTIFY_WIKI_SIGNING_KEY',
  NFT = 'ALCHEMY_NOTIFY_NFT_SIGNING_KEY',
}

export type ABIdecodeType = {
  anonymous: boolean
  inputs: {
    indexed: boolean
    internalType: string
    name: string
    type: string
  }[]
  name: string
  type: string
}[]

export type EventRequestData = {
  request: any
  res: Response
  value: EventData
}

export type TxData = {
  account: { address: string }
  data: string
  topics: string[]
  index: number
}

export type EventData = {
  webhookId: string
  id: string
  createdAt: string
  type: string
  event: {
    data: {
      block: BlockData
    }
  }
}

export type BlockData = {
  number: number
  logs: Log[]
}

export type Log = {
  transaction: {
    hash: string
    index: number
    from: {
      address: string
    }
    to: {
      address: string
    }
    logs: TxData[]
    type: number
    status: number
  }
}

export const decodeABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: '_ipfs',
        type: 'string',
      },
    ],
    name: 'Posted',
    type: 'event',
  },
]
