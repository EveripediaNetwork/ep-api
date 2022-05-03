import { Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import Activity from '../Database/Entities/activity.entity'

@Injectable()
class ActivityService {
  constructor(private connection: Connection) {}

  async countUserActivity(userId: string, intervalInHours: number): Promise<number> {
    const repository = this.connection.getRepository(Activity)
    const cr = await repository
      .createQueryBuilder('activity')
      .select('COUNT(*)')
      .where(
        `activity.userId = :id AND activity.datetime >= NOW() - INTERVAL '${intervalInHours} HOURS'`,
        {
          id: userId,
        },
      )
      .getRawOne()
    return parseInt(cr.count, 10)
  }
}

export default ActivityService
