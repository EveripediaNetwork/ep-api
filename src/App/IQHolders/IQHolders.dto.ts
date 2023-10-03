import { ArgsType, Field, Int } from '@nestjs/graphql'
import { Min, Max } from 'class-validator'
import { Injectable } from '@nestjs/common'
import PaginationArgs from '../pagination.args'
import { IntervalByDays } from '../general.args'

@ArgsType()
export default class IQHolderArgs extends PaginationArgs {
  @Field(() => IntervalByDays)
  interval = IntervalByDays.DAY

  @Field(() => String, { nullable: true })
  startDay?: string

  @Field(() => String, { nullable: true })
  endDay?: string

  @Field(() => Int)
  @Min(1)
  @Max(365)
  limit = 182
}

@Injectable()
export class LockingService {
  private isRunning = false

  async acquireLock(): Promise<boolean> {
    if (this.isRunning) {
      return false
    }

    this.isRunning = true
    return true
  }

  releaseLock(): void {
    this.isRunning = false
  }
}
