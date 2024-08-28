import { Controller, Get } from '@nestjs/common'
import { CacheService } from './cache.service'

@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get()
  async getCache() {
    return this.cacheService.getCache()
  }
}
