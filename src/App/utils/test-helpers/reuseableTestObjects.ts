import { User } from '@sentry/types'
import Language from '~/../src/Database/Entities/language.entity'

export const mockCacheStore = {
  get: jest.fn(),
  set: jest.fn(),
}

export const dummyWiki = {
  version: 1,
  promoted: 4,
  id: 'right-of-way',
  title: 'Right of way',
  hidden: false,
  block: 29053433,
  transactionHash:
    '0xbbd32825a412139494cb2c641e60c2d1b7d1dd0a0f9706d2b7b73e8050281d94',
  ipfs: 'QmWz3aaBqMvPfas3uqMyWdyARRFE9exc3tRQTr2raFjDfg',
  views: 2,
  content:
    'Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black **Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black** Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black Score cannot be black ..you sha have to make it work somehow',
  summary: 'right of way',
  metadata: [
    {
      id: 'coingecko_profile',
      value: 'https://www.coingecko.com/en/nft/otherdeed-for-otherside',
    },
    {
      id: 'previous_cid',
      value: 'QmemMd7TaNiP2wNgBEEn2Z5aLqfxHkhv5j2X6BwnKYqhH6',
    },
    { id: 'words-changed', value: '2' },
    { id: 'percent-changed', value: '0.19' },
    { id: 'blocks-changed', value: 'content, tags' },
    { id: 'wiki-score', value: '19' },
  ],
  media: [],
  linkedWikis: { founders: [], blockchains: [] },
  images: [
    {
      id: 'QmRN6gvCn4bWSS4QZjBJGQrsBiBisJvNyvjjpWLdKu6e8Q',
      type: 'image/jpeg, image/png',
    },
  ],
  created: new Date(),
  updated: new Date(),
  language: 'en' as unknown as Language,
  user: {
    id: '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e',
  } as unknown as User,
  tags: [],
  categories: [
    {
      id: 'dapps',
    },
  ],
}
