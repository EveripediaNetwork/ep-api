import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import TreasuryRepository from './treasury.repository'

@Injectable()
class TreasuryService {
    constructor(private repo: TreasuryRepository) {

    }
//   private counter = 0

//   @Cron(CronExpression.EVERY_10_SECONDS)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async storeToalValue() {
    // this.counter += 1
    // console.log(`Done ${this.counter}`)
    await this.repo.saveData('10000000000') 
    // console.log('done')
  }
}
export default TreasuryService
