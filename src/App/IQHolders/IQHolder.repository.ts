import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import IQHolder from '../../Database/Entities/iqHolder.entity'
import { IntervalByDays} from '../utils/queryHelpers'
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
                ROW_NUMBER() OVER (ORDER BY day DESC) AS row_num
            FROM iq_holder
            )
            SELECT amount, day
            FROM RankedData
            WHERE (row_num - 1) % $1 = 0
            OFFSET $2
            LIMIT $3;
        `,
        [args.interval, args.offset, args.limit, args.start, args.end],
      )
    }
    return this.createQueryBuilder('iq_holder')
      .select('amount')
      .addSelect('day')
      .offset(args.offset)
      .orderBy('day', 'DESC')
      .limit(args.limit)
      .getRawMany()
  }
}

export default IQHolderRepository
