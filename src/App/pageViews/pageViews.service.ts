import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Connection } from 'typeorm'
import PageviewsPerDay from '../../Database/Entities/pageviewsPerPage.entity'
import Wiki from '../../Database/Entities/wiki.entity'

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

  private async updatePageViewPerDay(id: string) {
    const repository = this.connection.getRepository(PageviewsPerDay)
    const date = new Date()
    const perDayWikiPageView = await repository.findOne({
      where: { wikiId: id, day: date },
    })

    if (!perDayWikiPageView) {
      const newPageView = repository.create({
        wikiId: id,
        day: date,
        visits: 1,
      })
      await repository.save(newPageView)
      return 1
    }
    await repository.query(
      `UPDATE pageviews_per_day SET visits = visits + $1 where "wikiId" = $2 AND day = $3`,
      [1, id, date],
    )
    return 1
  }

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
      return await this.updatePageViewPerDay(id)
    } catch (err) {
      console.error(err)
      return 0
    }
  }
}
export default PageViewsService
