import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import IQHolder from '../../Database/Entities/iqHolder.entity'
import { IntervalByDays } from '../utils/queryHelpers'
import IQHolderArgs from './IQHolders.dto'

@Injectable()
class IQHolderRepository extends Repository<IQHolder> {
  constructor(private dataSource: DataSource) {
    super(IQHolder, dataSource.createEntityManager())
  }

  async getIQHoldersCount(args: IQHolderArgs): Promise<IQHolder[]> {
    if (args.interval !== IntervalByDays.DAY) {
      return this.query(
        `
            WITH RankedData AS (
            SELECT
                amount, day,
                ROW_NUMBER() OVER (ORDER BY day) AS row_num
            FROM iq_holder
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
    return this.createQueryBuilder('iq_holder')
      .select('amount')
      .addSelect('day')
      .offset(args.offset)
      .limit(args.limit)
      .getRawMany()
  }
}

export default IQHolderRepository
