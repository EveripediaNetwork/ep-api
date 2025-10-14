import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common'
import { DataSource, Raw, Repository } from 'typeorm'
import Treasury from '../../Database/Entities/treasury.entity'
import { DateArgs } from '../Wiki/wikiStats.dto'

@Injectable()
class TreasuryRepository extends Repository<Treasury> implements OnModuleInit {
  private readonly logger = new Logger(TreasuryRepository.name)

  constructor(private dataSource: DataSource) {
    super(Treasury, dataSource.createEntityManager())
  }

  async onModuleInit() {
    await this.getCurrentTreasuryValue()
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0]
  }

  async getCurrentTreasuryValue(): Promise<Treasury | null> {
    const today = this.getTodayDateString()
    return this.findOne({
      where: {
        created: Raw((alias) => `DATE(${alias}) = '${today}'`),
      },
    })
  }

  async saveData(tokenValue: string): Promise<Treasury> {
    const existingEntry = await this.getCurrentTreasuryValue()

    if (!existingEntry) {
      const newTreasuryValue = this.create({
        totalValue: tokenValue,
        created: new Date().setHours(0, 0, 0, 0),
      })
      this.logger.debug(
        `Saving new treasury value: ${tokenValue} at ${newTreasuryValue.created}`,
      )
      return this.save(newTreasuryValue)
    }
    return existingEntry
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
