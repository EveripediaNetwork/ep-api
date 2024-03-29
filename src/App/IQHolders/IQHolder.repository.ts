import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import IQHolder from '../../Database/Entities/iqHolder.entity'
import IQHolderArgs from './IQHolders.dto'
import { IntervalByDays } from '../general.args'

@Injectable()
class IQHolderRepository extends Repository<IQHolder> {
  constructor(private dataSource: DataSource) {
    super(IQHolder, dataSource.createEntityManager())
  }

  async getIQHoldersCount(args: IQHolderArgs): Promise<IQHolder[]> {
    if (args.startDay && args.endDay) {
      return this.query(
        `
            SELECT amount, day
            FROM (
            SELECT amount, day,
                ROW_NUMBER() OVER (ORDER BY day DESC) AS row_num
                FROM iq_holder
            WHERE day >= $1 AND day <= $2
            ) AS RankedData
            WHERE (row_num - 1) % $3 = 0
            OFFSET $4
            LIMIT $5
        `,

        [args.startDay, args.endDay, args.interval, args.offset, args.limit],
      )
    }

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
        [args.interval, args.offset, args.limit],
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
