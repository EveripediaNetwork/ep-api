import { IsNumber, IsString } from 'class-validator'

class BrainPassDto {
  @IsNumber()
  tokenId!: number

  @IsString()
  owner!: string

  @IsString()
  image!: string

  @IsString()
  passName!: string

  @IsNumber()
  passId!: number

  @IsString()
  description!: string

  @IsString()
  metadataHash?: string

  @IsString()
  price!: string

  @IsString()
  transactionHash!: string

  @IsString()
  transactionType!: string
}

export enum BrainPassContractMethods {
  MINT = 'BrainPassBought',
  SUBSCRIBE = 'PassTimeIncreased',
}

enum PassTypes {
  BrainPass = 1,
}

interface PassMapping {
  [key: number]: string
}

export const passNames: PassMapping = {
  [PassTypes.BrainPass]: 'BrainPass',
}

export const brainPassAbi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: '_passName',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_price',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_passId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_startTimestamp',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_endTimestamp',
        type: 'uint256',
      },
    ],
    name: 'BrainPassBought',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_price',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_passId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_startTimestamp',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_newEndTimestamp',
        type: 'uint256',
      },
    ],
    name: 'PassTimeIncreased',
    type: 'event',
  },
]

export default BrainPassDto
