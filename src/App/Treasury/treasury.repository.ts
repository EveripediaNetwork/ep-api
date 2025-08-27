import { Injectable, Inject, OnModuleInit } from '@nestjs/common'
import { DataSource, Raw, Repository } from 'typeorm'
import Treasury from '../../Database/Entities/treasury.entity'
import { DateArgs } from '../Wiki/wikiStats.dto'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'

@Injectable()
class TreasuryRepository extends Repository<Treasury> implements OnModuleInit {
  constructor(
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(Treasury, dataSource.createEntityManager())
  }

  async onModuleInit() {
    await this.getCurrentTreasuryValue()
  }

  async getCurrentTreasuryValue(): Promise<Treasury | null> {
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `treasury_today_${today}`

    let existingEntry = await this.cacheManager.get<Treasury>(cacheKey)

    if (!existingEntry) {
      existingEntry = await this.findOne({
        where: {
          created: Raw((alias) => `DATE(${alias}) = '${today}'`),
        },
      })

      if (existingEntry) {
        await this.cacheManager.set(
          cacheKey,
          existingEntry,
          24 * 60 * 60 * 1000,
        )
      }
    }

    return existingEntry
  }

  async saveData(tokenValue: string): Promise<Treasury> {
    const existingEntry = await this.getCurrentTreasuryValue()

    if (existingEntry) {
      return existingEntry
    }

    const newTreasuryValue = this.create({
      totalValue: tokenValue,
    })

    const saved = await this.save(newTreasuryValue)

    const today = new Date().toISOString().split('T')[0]
    await this.cacheManager.set(
      `treasury_today_${today}`,
      saved,
      24 * 60 * 60 * 1000,
    )

    return saved
  }

  async getDailyTreasuryValue(date: DateArgs): Promise<Treasury[]> {
    const query = this.createQueryBuilder('treasury')
      .where(
        'treasury.created >= to_timestamp(:start) AND treasury.created <= to_timestamp(:end)',
      )
      .setParameters({
        start: date.startDate,
        end: date.endDate,
      })
    return query.getMany()
  }
}

export default TreasuryRepository
