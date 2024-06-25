import { Test, TestingModule } from '@nestjs/testing'
import { PosthogService } from './posthog.service'

describe('PosthogService', () => {
  let service: PosthogService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PosthogService],
    }).compile()

    service = module.get<PosthogService>(PosthogService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
