import { HttpModule } from '@nestjs/axios'
import { CacheModule } from '@nestjs/common'
import { TestingModule, Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { getMockRes } from '@jest-mock/express'
import { mockCacheStore } from '../utils/test-helpers/reuseableTestObjects'
import { getProviders, ProviderEnum } from '../utils/test-helpers/testHelpers'
import TagResolver from './tag.resolver'
import TagService from './tag.service'
import PaginationArgs from '../pagination.args'

describe('TagResolver', () => {
  let resolver: TagResolver
  let service: TagService
  let moduleRef: TestingModule
  let dataSource: {
    createEntityManager: jest.Mock
  }
  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        HttpModule,
        CacheModule.register({
          ttl: 3600,
          store: mockCacheStore,
        }),
      ],
      providers: [
        ...getProviders([
          ProviderEnum.tagResolver,
          ProviderEnum.tagService,
          ProviderEnum.wikiService,
          ProviderEnum.validSlug,
          ProviderEnum.configService,
          ProviderEnum.tagRepository,

          ProviderEnum.webhookHandler,
          ProviderEnum.discordWebhookService,
        ]),
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile()
    resolver = moduleRef.get<TagResolver>(TagResolver)
    service = moduleRef.get<TagService>(TagService)
  })

  it('should be defined', () => {
    expect(resolver).toBeDefined()
  })

  it('should return a total existing tags', async () => {
    const tags: any = getMockRes({
      data: {
        tags: [
          {
            id: 'Ethereum',
          },
          {
            id: 'Collections',
          },
          {
            id: 'exchange',
          },
          {
            id: 'listing',
          },
          {
            id: 'bitcoin',
          },
          {
            id: 'cryptocurrency',
          },
          {
            id: 'Protocols',
          },
          {
            id: 'Games',
          },
          {
            id: 'Polygon',
          },
          {
            id: 'BinanceSmartChain',
          },
          {
            id: 'Founders',
          },
          {
            id: 'Artists',
          },
          {
            id: 'Defi',
          },
          {
            id: 'exchanges',
          },
          {
            id: 'Cryptocurrencies',
          },
          {
            id: 'cryptoexchanges',
          },
          {
            id: 'cryptocurrencies',
          },
          {
            id: 'marketplace',
          },
          {
            id: 'DEXes',
          },
          {
            id: 'cryptoexchange',
          },
          {
            id: 'Cryptoexchange',
          },
          {
            id: 'polygon',
          },
          {
            id: 'crypto',
          },
          {
            id: 'smartcontract',
          },
          {
            id: 'CEXes',
          },
          {
            id: 'DEfi',
          },
          {
            id: 'cryptoexchage',
          },
          {
            id: 'crypptoexchange',
          },
          {
            id: 'NFT',
          },
          {
            id: 'Stablecoins',
          },
        ],
      },
    })
    jest.spyOn(service, 'getTags').mockResolvedValue(tags)
    expect(await resolver.tags(new PaginationArgs())).toBe(tags)
  })

  it('should return a tag with wikis having the search tag', async () => {
    const tags: any = getMockRes({
      data: {
        tagById: {
          id: 'cryptoexchange',
          wikis: [
            {
              id: 'bitpanda',
              tags: [
                {
                  id: 'CEXes',
                },
                {
                  id: 'cryptoexchange',
                },
              ],
            },
            {
              id: 'badger-dao',
              tags: [
                {
                  id: 'Protocols',
                },
                {
                  id: 'cryptoexchange',
                },
              ],
            },
            {
              id: 'akropolis',
              tags: [
                {
                  id: 'cryptoexchange',
                },
              ],
            },
          ],
        },
      },
    })
    jest.spyOn(service, 'getTagById').mockResolvedValue(tags)
    const hasSearchedTag = (wiki: any) =>
      wiki.tags.some((tag: { id: string }) => tag.id === 'cryptoexchange')
    const searchTagExists = tags.res.data.tagById.wikis.every(hasSearchedTag)
    expect(await resolver.tagById({ id: 'cryptoexchange' })).toBe(tags)
    expect(searchTagExists).toBe(true)
  })
})
