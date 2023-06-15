import { IsNumber, IsString } from 'class-validator'

class BrainPassDto {
  @IsNumber()
  nftId!: number

  @IsString()
  address!: string

  @IsString()
  image!: string

  @IsString()
  name!: string

  @IsString()
  description!: string

  @IsString()
  metadataHash?: string

  @IsNumber()
  amount!: number

  @IsString()
  transactionHash!: string
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
