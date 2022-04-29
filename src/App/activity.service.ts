import { Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import Activity from '../Database/Entities/activity.entity'

const limit = 3

@Injectable()
class ActivityService {
  constructor(private connection: Connection) {}

  async checkUserActivity(userId: string): Promise<boolean> {
    const repository = this.connection.getRepository(Activity)
    const userActivity = await repository
      .createQueryBuilder('activity')
      .where(
        `activity.userId = :id AND activity.datetime >= NOW() - INTERVAL '1 HOURS'`,
        {
          id: userId,
        },
      )
      .orderBy('datetime', 'DESC')
      .getMany()
      console.log(userActivity)
      if (userActivity.length !== limit) {
          return true
      }
      return false
  }
}

export default ActivityService
