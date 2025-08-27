import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import TreasuryRepository from './treasury.repository'
import { firstLevelNodeProcess } from './treasury.dto'
import { firstValueFrom } from 'rxjs'

@Injectable()
class TreasuryService {
  private readonly logger = new Logger(TreasuryService.name)

  constructor(
    private repo: TreasuryRepository,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private getTreasuryENVs() {
    return {
      debank: this.configService.get<string>('DEBANK_API_KEY'),
      treasury: this.configService.get<string>('TREASURY_ADDRESS'),
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async storeTotalValue() {
    if (firstLevelNodeProcess()) {
      const currentValue = await this.repo.getCurrentTreasuryValue()
      if (currentValue) {
        return
      }
      const value = await this.requestTotalbalance()
      if (value !== null) {
        return await this.repo.saveData(`${value}`)
      }
    }
  }

  async requestTotalbalance(): Promise<number | null> {
    const url = `https://pro-openapi.debank.com/v1/user/total_balance?id=${
      this.getTreasuryENVs().treasury
    }`
    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Accesskey: `${this.getTreasuryENVs().debank}`,
          },
        }),
      )
      const totalValue = res?.data.total_usd_value
      if (
        !isNaN(totalValue) &&
        totalValue !== null &&
        totalValue !== undefined
      ) {
        return totalValue
      }
      return null
    } catch (e: any) {
      this.logger.error(e)
    }
    return null
  }
}
export default TreasuryService
