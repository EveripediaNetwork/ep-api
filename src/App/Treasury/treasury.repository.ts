import { Injectable, Inject, OnModuleInit } from '@nestjs/common'
import { DataSource, Raw, Repository } from 'typeorm'
import Treasury from '../../Database/Entities/treasury.entity'
import { DateArgs } from '../Wiki/wikiStats.dto'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'

@Injectable()
class TreasuryRepository extends Repository<Treasury> implements OnModuleInit {
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000

  constructor(
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(Treasury, dataSource.createEntityManager())
  }

  async onModuleInit() {
    await this.getCurrentTreasuryValue()
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0]
  }

  private getTodayCacheKey(date?: string): string {
    const today = date || this.getTodayDateString()
    return `treasury_today_${today}`
  }

  private async updateTodayCache(entry: Treasury): Promise<void> {
    const cacheKey = this.getTodayCacheKey()
    await this.cacheManager.set(cacheKey, entry, this.CACHE_TTL)
  }

  async getCurrentTreasuryValue(): Promise<Treasury | null> {
    const today = this.getTodayDateString()
    const cacheKey = this.getTodayCacheKey(today)

    let existingEntry = await this.cacheManager.get<Treasury>(cacheKey)

    if (!existingEntry) {
      existingEntry = await this.findOne({
        where: {
          created: Raw((alias) => `DATE(${alias}) = '${today}'`),
        },
      })

      if (existingEntry) {
        await this.updateTodayCache(existingEntry)
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
      created: new Date().setHours(0, 0, 0, 0),
    })

    const saved = await this.save(newTreasuryValue)

    await this.updateTodayCache(saved)

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
