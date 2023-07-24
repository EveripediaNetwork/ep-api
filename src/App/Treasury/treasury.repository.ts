import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import Treasury from '../../Database/Entities/treasury.entity'
import { DateArgs } from '../Wiki/wikiStats.dto'
import { todayMidnightDate } from './treasury.dto'

@Injectable()
class TreasuryRepository extends Repository<Treasury> {
  constructor(private dataSource: DataSource) {
    super(Treasury, dataSource.createEntityManager())
  }

  async saveData(tokenValue: string): Promise<Treasury> {
    const newTreasuryValue = this.create({
      totalValue: tokenValue,
      created: todayMidnightDate,
      updated: todayMidnightDate,
    })
    return this.save(newTreasuryValue)
  }

  async getDailyTreasuryValue(date: DateArgs): Promise<Treasury[]> {
    return this.createQueryBuilder('treasury')
      .where(
        'treasury.created >= to_timestamp(:start) AND treasury.created <= to_timestamp(:end)',
      )
      .setParameters({
        start: date.startDate,
        end: date.endDate,
      })
      .getMany()
  }
}

export default TreasuryRepository
