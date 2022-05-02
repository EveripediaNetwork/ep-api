import {  Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import Activity from '../Database/Entities/activity.entity'

@Injectable()
class ActivityService {
  constructor(private connection: Connection) {}

  async countUserActivity(userId: string, interval: number): Promise<number> {
    const repository = this.connection.getRepository(Activity)
    const cr = await repository
      .createQueryBuilder('activity')
      .where(
        `activity.userId = :id AND activity.datetime >= NOW() - INTERVAL '${interval} HOURS'`,
        {
          id: userId,
        },
      )
      .getCount()
      return cr
  }
}

export default ActivityService
