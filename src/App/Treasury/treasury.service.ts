import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import TreasuryRepository from './treasury.repository'
import { firstLevelNodeProcess } from './treasury.dto'

@Injectable()
class TreasuryService {
  constructor(
    private repo: TreasuryRepository,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  private getTreasuryENVs() {
    return {
      debank: this.configService.get<string>('DEBANK_API_KEY'),
      treasury: this.configService.get<string>('TREASURY_ADDRESS'),
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async storeTotalValue() {
    if (firstLevelNodeProcess()) {
      const value = await this.requestTotalbalance()
      await this.repo.saveData(`${value}`)
    }
  }

  async requestTotalbalance(): Promise<number | null> {
    const url = `https://pro-openapi.debank.com/v1/user/total_balance?id=${
      this.getTreasuryENVs().treasury
    }`
    try {
      const res = await this.httpService
        .get(url, {
          headers: {
            Accesskey: `${this.getTreasuryENVs().debank}`,
          },
        })
        .toPromise()
      return res?.data.total_usd_value
    } catch (e: any) {
      console.error(e)
    }
    return null
  }
}
export default TreasuryService
