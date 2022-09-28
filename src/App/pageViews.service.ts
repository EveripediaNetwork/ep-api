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
    const existWiki = await wikiRepository.findOne({
      id,
    })
    if (cached || !existWiki) {
      return 0
    }
    const viewedWiki = await wikiRepository.findOne({
      id,
    })
    if (viewedWiki) {
      await wikiRepository
        .createQueryBuilder()
        .update(Wiki)
        .set({ views: () => 'views + 1' })
        .where('id = :id', { id })
        .execute()
      await this.cacheManager.set(id, ip)
      return viewedWiki.views + 1
    }
    await wikiRepository
      .createQueryBuilder()
      .update(Wiki)
      .set({ views: 1 })
      .where('id = :id', { id })
      .execute()

    await this.cacheManager.set(id, ip)
    return 1
  }
}
export default PageViewsService
