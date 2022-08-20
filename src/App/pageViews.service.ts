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

  async updateCount(id: string, ip: string): Promise<boolean> {
    const repository = this.connection.getRepository(PageViews)
    console.log(ip)
    console.log(typeof ip)
    const cached: WikiViewed | undefined = await this.cacheManager.get(id)
    if (cached) {
      return true
    }
    // find wiki from wiki table
    const wiki = await repository.findOne({
      wiki_id: id,
    })
    if (wiki) {
      await repository
        .createQueryBuilder()
        .update(PageViews)
        .set({ views: () => 'views + 1' })
        .where('wiki_id = :wiki_id', { wiki_id: id })
        .execute()
    }
    // add one to  view
    const createView = repository.create({ wiki_id: id })
    await repository.save(createView)
    // no wiki found, create one and updateCount
    console.log(id)
    await this.cacheManager.set(id, ip)
    return true
  }
}
export default PageViewsService
