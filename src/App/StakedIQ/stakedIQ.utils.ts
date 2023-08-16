import { Repository } from 'typeorm'
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

export const leastRecordByDate = async (
  repo: Repository<StakedIQ | Treasury>,
): Promise<Partial<StakedIQ>[] | Partial<Treasury>[] | []> =>
  repo.find({
    order: {
      updated: 'DESC',
    },
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

export const stopJob = async (
  repo: Repository<StakedIQ | Treasury>,
  job: CronJob,
) => {
  const oldRecord = await leastRecordByDate(repo)

  if (oldRecord.length > 0) {
    const oldDate = dateOnly(oldRecord[0]?.created as Date)
    const presentDate = dateOnly(todayMidnightDate)
    if (oldDate === presentDate) {
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
