import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { ethers } from 'ethers'
import StackedIQ from '../../Database/Entities/stakedIQ.entity'
import erc20Abi from '../utils/erc20Abi'

@Injectable()
class StakedIQService {
  constructor(
    private repo: StackedIQ,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  //   @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @Cron(CronExpression.EVERY_10_SECONDS)
  async storeIQStacked() {
    // const value = await this.main()
    await this.getTVL()
    // await this.repo.saveData(`${value}`)
  }

  async getTVL() {
     const iface = new ethers.utils.Interface(erc20Abi)
     console.log(iface)
  }
}
export default StakedIQService
