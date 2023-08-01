import { TxData } from '../../ExternalServices/alchemyNotify.dto'

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
