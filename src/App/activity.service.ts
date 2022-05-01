import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
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
        `activity.userId = :id AND activity.datetime >= NOW() - INTERVAL '72 HOURS'`,
        {
          id: userId,
        },
      )
      .orderBy('datetime', 'DESC')
      .getMany()
    console.log(userActivity, userActivity.length)
    if (userActivity.length <= limit) {
      return true
    }
    throw new HttpException(
      {
        status: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too many requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }
}

export default ActivityService
