import { Injectable, Inject } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import TreasuryRepository from './treasury.repository'
import { firstLevelNodeProcess } from './treasury.dto'

@Injectable()
class TreasuryService {
  constructor(
    private repo: TreasuryRepository,
    private configService: ConfigService,
    private httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
      let value: number | null | undefined = await this.cacheManager.get(
        'treasuryBalance',
      )
      if (!value) {
        value = await this.requestTotalbalance()
        await this.cacheManager.set('treasuryBalance', value, 7200 * 1000)
      }
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
