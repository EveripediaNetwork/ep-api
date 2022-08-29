import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Connection } from 'typeorm'
import PageViews from '../Database/Entities/pageViews.entity'
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
    const viewRepository = this.connection.getRepository(PageViews)
    const wikiRepository = this.connection.getRepository(Wiki)
    const cached: WikiViewed | undefined = await this.cacheManager.get(id)
    const existWiki = await wikiRepository.findOne({
      id,
    })
    if (cached || !existWiki) {
      return 0
    }
    const viewedWiki = await viewRepository.findOne({
      wiki_id: id,
    })
    if (viewedWiki) {
      await viewRepository
        .createQueryBuilder()
        .update(PageViews)
        .set({ views: () => 'views + 1' })
        .where('wiki_id = :wiki_id', { wiki_id: id })
        .execute()
      await this.cacheManager.set(id, ip)
      return viewedWiki.views + 1
    }

    const createView = viewRepository.create({ wiki_id: id, views: 1 })
    await viewRepository.save(createView)
    await this.cacheManager.set(id, ip)
    return 1
  }
}
export default PageViewsService
