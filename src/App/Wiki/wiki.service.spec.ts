import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { DataSource, Repository } from 'typeorm'
import { Cache } from 'cache-manager'
import WikiService from './wiki.service'
import { ValidSlug } from '../utils/validSlug'
import Wiki from '../../Database/Entities/wiki.entity'
import DiscordWebhookService from '../utils/discordWebhookService'
import { Direction, OrderBy } from '../general.args'
import { eventTag } from './wiki.dto'

describe('WikiService', () => {
  let wikiService: WikiService
  let dataSource: jest.Mocked<DataSource>
  let repository: jest.Mocked<Repository<Wiki>>
  let cacheManager: jest.Mocked<Cache>
  let configService: jest.Mocked<ConfigService>
  let httpService: jest.Mocked<HttpService>
  let discordService: jest.Mocked<DiscordWebhookService>
  let validSlug: jest.Mocked<ValidSlug>

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    setParameter: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  }

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      query: jest.fn(),
    } as any

    dataSource = {
      getRepository: jest.fn().mockReturnValue(repository),
      manager: {
        getRepository: jest.fn().mockReturnValue(repository),
      },
    } as any

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    } as any

    configService = {
      get: jest.fn(),
    } as any

    httpService = {
      get: jest.fn(),
    } as any

    discordService = {
      updateAddressToWikiCache: jest.fn(),
    } as any

    validSlug = {
      validateSlug: jest.fn(),
    } as any

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WikiService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: DiscordWebhookService,
          useValue: discordService,
        },
        {
          provide: ValidSlug,
          useValue: validSlug,
        },
      ],
    }).compile()

    wikiService = module.get<WikiService>(WikiService)
  })

  describe('getWikiIds', () => {
    it('should return wiki ids and updated dates', async () => {
      const wikis = [
        { id: 'wiki1', updated: new Date() },
        { id: 'wiki2', updated: new Date() },
      ]
      repository.find.mockResolvedValue(wikis)

      const result = await wikiService.getWikiIds()

      expect(result).toEqual(wikis)
      expect(repository.find).toHaveBeenCalledWith({
        select: ['id', 'updated'],
        where: { hidden: false },
      })
    })
  })

  describe('findWiki', () => {
    it('should return a wiki by id and lanuage', async () => {
      const wiki = { id: 'wiki1', title: 'Test Wiki' }
      queryBuilder.getOne.mockResolvedValue(wiki)

      const result = await wikiService.findWiki({ id: 'wiki1', lang: 'en' })

      expect(result).toEqual(wiki)
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'wiki.languageId = :lang',
        { lang: 'en' },
      )
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('wiki.id = :id', {
        id: 'wiki1',
      })
    })
  })

  describe('getWikis', () => {
    it('should return wikis with pagination and ordering', async () => {
      const wikis = [
        { id: 'wiki1', title: 'Test Wiki 1' },
        { id: 'wiki2', title: 'Test Wiki 2' },
      ]
      repository.find.mockResolvedValue(wikis)

      const result = await wikiService.getWikis({
        lang: 'en',
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
      })

      expect(result).toEqual(wikis)
      expect(repository.find).toHaveBeenCalledWith({
        where: {
          language: { id: 'en' },
          hidden: false,
        },
        cache: {
          id: 'wikis_cache_limit10-offset0-langen-directionDESC-orderupdated',
          milliseconds: 10000,
        },
        take: 10,
        skip: 0,
        order: { updated: 'DESC' },
      })
    })
  })

  describe('getPromotedWikis', () => {
    it('should return promoted wikis', async () => {
      const wikis = [
        { id: 'wiki1', promoted: 1 },
        { id: 'wiki2', promoted: 2 },
      ]
      queryBuilder.getMany.mockResolvedValue(wikis)

      const result = await wikiService.getPromotedWikis({
        lang: 'en',
        limit: 10,
        offset: 0,
        direction: Direction.DESC,
        order: OrderBy.UPDATED,
        hidden: true,
      })

      expect(result).toEqual(wikis)
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'wiki.languageId = :lang',
        { lang: 'en' },
      )
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('wiki.promoted > 0')
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('wiki.hidden = false')
    })

    it('should filter featured events when specified', async () => {
      const wikis = [
        { id: 'wiki1', promoted: 1 },
        { id: 'wiki2', promoted: 2 },
      ]
      queryBuilder.getMany.mockResolvedValue(wikis)

      const result = await wikiService.getPromotedWikis(
        {
          lang: 'en',
          limit: 10,
          offset: 0,
          direction: Direction.DESC,
          order: OrderBy.UPDATED,
          hidden: true,
        },
        true,
      )

      expect(result).toEqual(wikis)
      expect(queryBuilder.innerJoin).toHaveBeenCalledWith('wiki.tags', 'tag')
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(tag.id) = LOWER(:eventTag)',
        { eventTag },
      )
    })
  })

  describe('hideWiki', () => {
    it('should hide a wiki and reset its promotion', async () => {
      const wiki = { id: 'wiki1', title: 'Test Wiki' }
      repository.findOneBy.mockResolvedValue(wiki)

      const result = await wikiService.hideWiki(
        { id: 'wiki1', lang: 'en' },
        false,
      )

      expect(result).toEqual(wiki)
      expect(queryBuilder.update).toHaveBeenCalled()
      expect(queryBuilder.set).toHaveBeenCalledWith({
        hidden: true,
        promoted: 0,
      })
      expect(queryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'wiki1',
      })
    })
  })

  describe('unhideWiki', () => {
    it('should unhide a wiki', async () => {
      const wiki = { id: 'wiki1', title: 'Test Wiki' }
      repository.findOneBy.mockResolvedValue(wiki)

      const result = await wikiService.unhideWiki({ id: 'wiki1', lang: 'en' })

      expect(result).toEqual(wiki)
      expect(queryBuilder.update).toHaveBeenCalled()
      expect(queryBuilder.set).toHaveBeenCalledWith({ hidden: false })
      expect(queryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'wiki1',
      })
    })
  })
})
