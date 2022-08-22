import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Connection } from 'typeorm'
import PageViews from '../Database/Entities/pageViews.entity'

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
    const repository = this.connection.getRepository(PageViews)
    const cached: WikiViewed | undefined = await this.cacheManager.get(id)
    if (cached) {
      return 0
    }
    const wiki = await repository.findOneOrFail({
      wiki_id: id,
    })

    await repository
      .createQueryBuilder()
      .update(PageViews)
      .set({ views: () => 'views + 1' })
      .where('wiki_id = :wiki_id', { wiki_id: id })
      .execute()

    const createView = repository.create({ wiki_id: id })
    await repository.save(createView)
    await this.cacheManager.set(id, ip)
    return wiki.views
  }
}
export default PageViewsService
