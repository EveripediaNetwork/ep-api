import { ObjectLiteral, Repository } from 'typeorm'
import { CronJob } from 'cron'
import StakedIQ from '../../Database/Entities/stakedIQ.entity'
import Treasury from '../../Database/Entities/treasury.entity'
import {
  dateOnly,
  todayMidnightDate,
  oneYearAgo,
} from '../Treasury/treasury.dto'

export const existRecord = async (
  date: Date,
  model: string,
  repo: Repository<StakedIQ | Treasury>,
): Promise<StakedIQ | Treasury | null> => {
  const formattedDate = dateOnly(date)
  return repo
    .createQueryBuilder(model)
    .where(`${model}.created::DATE = :formattedDate`, {
      formattedDate,
    })
    .getOne()
}

export const leastRecordByDate = async <T extends ObjectLiteral>(
  repo: Repository<T>,
): Promise<Partial<T>[]> =>
  repo.find({
    order: {
      updated: 'DESC',
    } as any,
    take: 1,
  })

export const insertOldData = async (
  value: number,
  date: Date,
  entity: Repository<StakedIQ | Treasury>,
): Promise<void> => {
  const createObject = {
    created: date,
    updated: date,
  }
  let data
  if (entity.metadata.target === Treasury) {
    data = { ...createObject, totalValue: `${value}` }
  }
  if (entity.metadata.target === StakedIQ) {
    data = { ...createObject, amount: `${value}` }
  }
  const previousData = entity.create({ ...data })
  await entity.save(previousData)
  console.log(`Previous ${entity.metadata.targetName} data saved`)
}

interface EntityWithCreated {
  created?: Date
}

export const stopJob = async <T extends EntityWithCreated>(
  repo: Repository<T>,
  job: CronJob,
  date?: Date,
) => {
  const oldRecord = await leastRecordByDate(repo)

  if (oldRecord.length > 0 && oldRecord[0].created) {
    const oldDate = dateOnly(oldRecord[0].created)
    const presentDate = dateOnly(todayMidnightDate)
    const stopDate = date ? dateOnly(date) : presentDate

    if (oldDate === stopDate) {
      job.stop()
    }
  }
}

export const getDates = async (repo: Repository<StakedIQ | Treasury>) => {
  const oldRecord = await leastRecordByDate(repo)

  const oneDayInSeconds = 86400
  let time
  if (oldRecord && oldRecord.length > 0) {
    const record = oldRecord[0].created as Date
    time = Math.floor(new Date(record).getTime() / 1000) + oneDayInSeconds
  } else {
    time = oneYearAgo
  }

  const previousDate = time * 1000
  const incomingDate = new Date(previousDate)

  return { time, incomingDate }
}
