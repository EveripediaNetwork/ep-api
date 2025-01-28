import { Test, TestingModule } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import WebhookHandler from './discordWebhookHandler'
import { ActionTypes } from './utilTypes'

describe('WebhookHandler', () => {
  let webhookHandler: WebhookHandler
  let httpService: HttpService
  let configService: ConfigService
  // let dataSource: DataSource

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookHandler,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOneBy: jest.fn(),
              find: jest.fn(),
            }),
          },
        },
      ],
    }).compile()

    webhookHandler = module.get<WebhookHandler>(WebhookHandler)
    httpService = module.get<HttpService>(HttpService)
    configService = module.get<ConfigService>(ConfigService)
    // dataSource = module.get<DataSource>(DataSource)
  })

  it('should be defined', () => {
    expect(webhookHandler).toBeDefined()
  })

  it('should handle ADMIN_ACTION correctly', async () => {
    const payload = {
      user: 'testUser',
      adminAction: 'HIDE_WIKI',
      urlId: '123',
    }
    jest.spyOn(configService, 'get').mockReturnValue('{}')
    jest.spyOn(httpService, 'post').mockReturnValue({
      subscribe: jest.fn(),
    } as any)

    await webhookHandler.postWebhook(ActionTypes.ADMIN_ACTION, payload)

    expect(httpService.post).toHaveBeenCalled()
  })

  it('should handle FLAG_WIKI correctly', async () => {
    const payload = {
      user: 'testUser',
      urlId: '123',
      description: 'Test description',
    }
    jest.spyOn(configService, 'get').mockReturnValue('{}')
    jest.spyOn(httpService, 'post').mockReturnValue({
      subscribe: jest.fn(),
    } as any)

    await webhookHandler.postWebhook(ActionTypes.FLAG_WIKI, payload)

    expect(httpService.post).toHaveBeenCalled()
  })
})
