import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Connection } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'

interface WikiViewed {
  ip: string
  wiki_id: string
}

@Injectable()
class PageViewsService {
  constructor(
    private connection: Connection,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async updateCount(id: string, ip: string): Promise<number> {
    const wikiRepository = this.connection.getRepository(Wiki)
    const cached: WikiViewed | undefined = await this.cacheManager.get(id)

    if (cached) {
      return 0
    }

    try {
      await wikiRepository.query(
        `UPDATE wiki SET views = views + $1, updated = updated where id = $2`,
        [1, id],
      )
      await this.cacheManager.set(id, ip)
      return 1
    } catch (err) {
      return 0
    }
  }
}
export default PageViewsService
