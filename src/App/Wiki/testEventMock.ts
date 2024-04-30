import Wiki from '../../Database/Entities/wiki.entity'

const testEvents: Partial<Wiki>[] = [
  {
    id: 'paris-blockchain-week-5th-edition',
    tags: [
      {
        id: 'Events',
        wikis: [],
      },
    ],
  },
  {
    id: 'blockchain-lagos',
    tags: [
      {
        id: 'Ethereum',
        wikis: [],
      },
      {
        id: 'DEXes',
        wikis: [],
      },
      {
        id: 'Polygon',
        wikis: [],
      },
      {
        id: 'Events',
        wikis: [],
      },
    ],
  },
  {
    id: 'web3-lagos',
    tags: [
      {
        id: 'Ethereum',
        wikis: [],
      },
      {
        id: 'Events',
        wikis: [],
      },
      {
        id: 'Solana',
        wikis: [],
      },
      {
        id: 'Conference',
        wikis: [],
      },
    ],
  },
  {
    id: 'the-blockchain-event',
    tags: [
      {
        id: 'Polygon',
        wikis: [],
      },
      {
        id: 'Events',
        wikis: [],
      },
      {
        id: 'AI',
        wikis: [],
      },
      {
        id: 'Conference',
        wikis: [],
      },
    ],
  },
  {
    id: 'mwc-barcelona',
    tags: [
      {
        id: 'Events',
        wikis: [],
      },
      {
        id: 'AI',
        wikis: [],
      },
      {
        id: 'Developers',
        wikis: [],
      },
      {
        id: 'BinanceSmartChain',
        wikis: [],
      },
    ],
  },
  {
    id: 'international-conference-on-blockchain-and-cryptocurrencies',
    tags: [
      {
        id: 'Events',
        wikis: [],
      },
      {
        id: 'AI',
        wikis: [],
      },
      {
        id: 'Developers',
        wikis: [],
      },
      {
        id: 'BinanceSmartChain',
        wikis: [],
      },
    ],
  },
  {
    id: 'ethdenver-innovation-festival',
    tags: [
      {
        id: 'Events',
        wikis: [],
      },
      {
        id: 'AI',
        wikis: [],
      },
      {
        id: 'BinanceSmartChain',
        wikis: [],
      },
      {
        id: 'CEXes',
        wikis: [],
      },
    ],
  },
  {
    id: 'quantum-miami-2024',
    tags: [
      {
        id: 'Ethereum',
        wikis: [],
      },
      {
        id: 'Stablecoins',
        wikis: [],
      },
      {
        id: 'Events',
        wikis: [],
      },
      {
        id: 'Blockchains',
        wikis: [],
      },
    ],
  },
  {
    id: 'metavsummit',
    tags: [
      {
        id: 'Ethereum',
        wikis: [],
      },
      {
        id: 'Events',
        wikis: [],
      },
      {
        id: 'Blockchains',
        wikis: [],
      },
    ],
  },
]

const mockEvents: Partial<Wiki>[] = [
  {
    id: 'paris-blockchain-week-5th-edition',
    title: 'Paris Blockchain Week 5th Edition',
    hidden: false,
    tags: [
      { id: 'Events', wikis: [] },
      { id: 'Blockchains', wikis: [] },
    ],
    views: 100,
  },
  {
    id: 'blockchain-lagos',
    title: 'Blockchain Lagos',
    hidden: false,
    tags: [
      { id: 'Ethereum', wikis: [] },
      { id: 'DEXes', wikis: [] },
      { id: 'Polygon', wikis: [] },
      { id: 'Events', wikis: [] },
    ],
    views: 800,
  },
]

export { mockEvents, testEvents }
