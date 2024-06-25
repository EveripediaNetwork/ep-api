import { Test, TestingModule } from '@nestjs/testing'
import { PostHogService } from './posthog.service'

describe('PosthogService', () => {
  let service: PostHogService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostHogService],
    }).compile()

    service = module.get<PostHogService>(PostHogService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
