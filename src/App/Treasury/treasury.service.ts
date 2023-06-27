import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

@Injectable()
class TreasuryService {
  @Cron('*/10 * * * * *') // Cron schedule expression (runs every 10 seconds)
  handleCron() {
    console.log('Done')
  }
}
export default TreasuryService
