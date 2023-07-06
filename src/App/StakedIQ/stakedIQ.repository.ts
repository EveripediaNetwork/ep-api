import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { DateArgs } from '../Wiki/wikiStats.dto'
import StakedIQ from '../../Database/Entities/stakedIQ.entity'

@Injectable()
class StakedIQRepository extends Repository<StakedIQ> {
  constructor(private dataSource: DataSource) {
    super(StakedIQ, dataSource.createEntityManager())
  }

  async saveData(tokenValue: string): Promise<StakedIQ> {
    const IQStaked = this.create({ amount: tokenValue })
    return this.save(IQStaked)
  }

  async getDailyStakedIQ(date: DateArgs): Promise<StakedIQ[]> {
    return this.createQueryBuilder('staked_iq')
      .where(
        'staked_iq.created >= to_timestamp(:start) AND staked_iq.created <= to_timestamp(:end)',
      )
      .setParameters({
        start: date.startDate,
        end: date.endDate,
      })
      .getMany()
  }
}

export default StakedIQRepository
