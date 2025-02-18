import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpModule } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import RevalidatePageResolver from './revalidatePage.resolver'
import { RevalidatePageService, Routes } from './revalidatePage.service'
import WebhookHandler from '../utils/discordWebhookHandler'
import TokenValidator from '../utils/validateToken'

describe('RevalidatePageResolver', () => {
  let revalidatePageResolver: RevalidatePageResolver
  let revalidatePageService: RevalidatePageService
  let dataSource: {
    createEntityManager: jest.Mock
  }
  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    }
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        RevalidatePageResolver,
        RevalidatePageService,
        WebhookHandler,
        TokenValidator,
        EventEmitter2,
        {
          provide: CACHE_MANAGER,
          useValue: CACHE_MANAGER,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: ConfigService,
          useValue: {
            key: '',
            secret: '',
          },
        },
      ],
    }).compile()
    revalidatePageResolver = module.get<RevalidatePageResolver>(
      RevalidatePageResolver,
    )
    revalidatePageService = module.get<RevalidatePageService>(
      RevalidatePageService,
    )
  })
  describe('revalidatePage', () => {
    it('should be defined', async () => {
      expect(revalidatePageResolver).toBeDefined()
    })
    it('revalidatePage should call revalidateService and emit an event', async () => {
      const args: any = {
        route: Routes.USER_PAGE,
      }

      const ctx: any = {
        req: {
          ip: '127.0.0.1',
        },
      }

      const revalidateSpy = jest
        .spyOn(revalidatePageService, 'revalidate')
        .mockResolvedValue(true)
      const eventEmitterSpy = jest.spyOn(EventEmitter2.prototype, 'emit')

      const result = await revalidatePageResolver.revalidatePage(args, ctx)

      expect(result).toBe(true)
      expect(revalidateSpy).toHaveBeenCalledWith(args.route)
      expect(eventEmitterSpy).toHaveBeenCalledWith(
        'admin.action',
        `${ctx.req.ip}${args.route}`,
      )
    })
    it('should instantiate RevalidatePageResolver with RevalidatePageService and EventEmitter2', () => {
      expect(revalidatePageResolver).toBeInstanceOf(RevalidatePageResolver)
    })
  })
})
