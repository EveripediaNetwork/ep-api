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
    inputs: [
      { internalType: 'address', name: 'IqAddr', type: 'address' },
      { internalType: 'string', name: '_baseTokenURI', type: 'string' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'AlreadyMintedAPass', type: 'error' },
  { inputs: [], name: 'DurationNotInTimeFrame', type: 'error' },
  { inputs: [], name: 'IncreseTimePaymentFailed', type: 'error' },
  { inputs: [], name: 'InvalidMaxTokensForAPass', type: 'error' },
  { inputs: [], name: 'MintingPaymentFailed', type: 'error' },
  { inputs: [], name: 'NoEtherLeftToWithdraw', type: 'error' },
  { inputs: [], name: 'NoIQLeftToWithdraw', type: 'error' },
  { inputs: [], name: 'NotTheOwnerOfThisNft', type: 'error' },
  { inputs: [], name: 'PassMaxSupplyReached', type: 'error' },
  { inputs: [], name: 'PassTypeIsPaused', type: 'error' },
  { inputs: [], name: 'PassTypeNotFound', type: 'error' },
  { inputs: [], name: 'TransferFailed', type: 'error' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'approved',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      { indexed: false, internalType: 'bool', name: 'approved', type: 'bool' },
    ],
    name: 'ApprovalForAll',
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
        internalType: 'uint256',
        name: '_passId',
        type: 'uint256',
      },
      { indexed: false, internalType: 'string', name: '_name', type: 'string' },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_maxtokens',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_pricePerDay',
        type: 'uint256',
      },
    ],
    name: 'NewPassAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: '_passId',
        type: 'uint256',
      },
      { indexed: false, internalType: 'string', name: '_name', type: 'string' },
    ],
    name: 'PassTypeStatusToggled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Paused',
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
    name: 'TimeIncreased',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'Unpaused',
    type: 'event',
  },
  {
    inputs: [],
    name: 'MINT_LOWER_LIMIT',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MINT_UPPER_LIMIT',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pricePerDay', type: 'uint256' },
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'uint256', name: 'maxTokens', type: 'uint256' },
      { internalType: 'uint256', name: 'discount', type: 'uint256' },
    ],
    name: 'addPassType',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'addressToNFTPass',
    outputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'passId', type: 'uint256' },
      { internalType: 'uint256', name: 'startTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'endTimestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'baseTokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'lowerLimit', type: 'uint256' },
      { internalType: 'uint256', name: 'upperLimit', type: 'uint256' },
    ],
    name: 'configureMintLimit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAllPassType',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'passId', type: 'uint256' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'uint256', name: 'pricePerDay', type: 'uint256' },
          { internalType: 'uint256', name: 'maxTokens', type: 'uint256' },
          { internalType: 'uint256', name: 'discount', type: 'uint256' },
          { internalType: 'uint256', name: 'lastMintedId', type: 'uint256' },
          { internalType: 'bool', name: 'isPaused', type: 'bool' },
        ],
        internalType: 'struct BrainPassCollectibles.PassType[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'passId', type: 'uint256' }],
    name: 'getPassType',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'passId', type: 'uint256' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'uint256', name: 'pricePerDay', type: 'uint256' },
          { internalType: 'uint256', name: 'maxTokens', type: 'uint256' },
          { internalType: 'uint256', name: 'discount', type: 'uint256' },
          { internalType: 'uint256', name: 'lastMintedId', type: 'uint256' },
          { internalType: 'bool', name: 'isPaused', type: 'bool' },
        ],
        internalType: 'struct BrainPassCollectibles.PassType',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserPassDetails',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'passId', type: 'uint256' },
          { internalType: 'uint256', name: 'startTimestamp', type: 'uint256' },
          { internalType: 'uint256', name: 'endTimestamp', type: 'uint256' },
        ],
        internalType: 'struct BrainPassCollectibles.UserPassItem',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'newEndTime', type: 'uint256' },
    ],
    name: 'increaseEndTime',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'iqToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'operator', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'passId', type: 'uint256' },
      { internalType: 'uint256', name: 'startTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'endTimestamp', type: 'uint256' },
    ],
    name: 'mintNFT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'passTypes',
    outputs: [
      { internalType: 'uint256', name: 'passId', type: 'uint256' },
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'uint256', name: 'pricePerDay', type: 'uint256' },
      { internalType: 'uint256', name: 'maxTokens', type: 'uint256' },
      { internalType: 'uint256', name: 'discount', type: 'uint256' },
      { internalType: 'uint256', name: 'lastMintedId', type: 'uint256' },
      { internalType: 'bool', name: 'isPaused', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'operator', type: 'address' },
      { internalType: 'bool', name: 'approved', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: '_baseTokenURI', type: 'string' }],
    name: 'setBaseURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'passId', type: 'uint256' }],
    name: 'togglePassTypeStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdrawEther',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdrawIQ',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
]

export default BrainPassDto
