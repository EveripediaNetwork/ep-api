import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import HiIQHolder from '../../Database/Entities/hiIQHolder.entity'
import HiIQHolderArgs from './hiIQHolders.dto'
import { IntervalByDays } from '../general.args'

@Injectable()
class HiIQHolderRepository extends Repository<HiIQHolder> {
  constructor(private dataSource: DataSource) {
    super(HiIQHolder, dataSource.createEntityManager())
  }

  async getHiIQHoldersCount(args: HiIQHolderArgs): Promise<HiIQHolder[]> {
    if (args.interval !== IntervalByDays.DAY) {
      return this.query(
        `
            WITH RankedData AS (
            SELECT
                amount, day,
                ROW_NUMBER() OVER (ORDER BY day) AS row_num
            FROM hi_iq_holder
            )
            SELECT amount, day
            FROM RankedData
            WHERE (row_num - 1) % $1 = 0
            ORDER BY day
            OFFSET $2
            LIMIT $3;
        `,
        [args.interval, args.offset, args.limit],
      )
    }
    return this.createQueryBuilder('hi_iq_holder')
      .select('amount')
      .addSelect('day')
      .offset(args.offset)
      .limit(args.limit)
      .getRawMany()
  }
}

export default HiIQHolderRepository
