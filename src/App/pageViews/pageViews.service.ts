import { Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { DataSource, Repository } from 'typeorm'
import PageviewsPerDay from '../../Database/Entities/pageviewsPerPage.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import { WikiViewArgs, WikiViews } from './pageviews.dto'

interface WikiViewed {
  ip: string
  wiki_id: string
}

const presentDate = new Date()

const timePeriod = (days: number): Date =>
  new Date(presentDate.getTime() - days * 24 * 60 * 60 * 1000)

@Injectable()
class PageViewsService {
  constructor(
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async repository(): Promise<Repository<PageviewsPerDay>> {
    return this.dataSource.getRepository(PageviewsPerDay)
  }

  private async updatePageViewPerDay(id: string) {
    const perDayWikiPageView = await (await this.repository()).findOne({
      where: { wikiId: id, day: presentDate },
    })

    if (!perDayWikiPageView) {
      const newPageView = (await this.repository()).create({
        wikiId: id,
        day: presentDate,
        visits: 1,
      })
      await (await this.repository()).save(newPageView)
      return 1
    }
    await (await this.repository()).query(
      `UPDATE pageviews_per_day SET visits = visits + $1 where "wikiId" = $2 AND day = $3`,
      [1, id, presentDate],
    )
    return 1
  }

  async updateCount(id: string, ip: string): Promise<number> {
    const wikiRepository = this.dataSource.getRepository(Wiki)
    const cached: WikiViewed | null | undefined =
      await this.cacheManager.get(id)

    if (cached) {
      return 0
    }

    try {
      await wikiRepository.query(
        'UPDATE wiki SET views = views + $1, updated = updated where id = $2',
        [1, id],
      )
      await this.cacheManager.set(id, ip)
      return await this.updatePageViewPerDay(id)
    } catch (err) {
      console.error(err)
      return 0
    }
  }

  async getWikiViews(args: WikiViewArgs): Promise<WikiViews[]> {
    return (await this.repository())
      .createQueryBuilder('pageviews_per_day')
      .select('day')
      .addSelect('Sum(visits)', 'visits')
      .where('day >= :start', { start: timePeriod(args.days) })
      .andWhere('day <= :end', { end: presentDate })
      .offset(args.offset)
      .groupBy('day')
      .orderBy(args.order, args.direction)
      .getRawMany()
  }
}
export default PageViewsService
