import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export const injestId = 'injest.action'
@Injectable()
class AutoInjestService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async initiateInjest() {
    const scraperUrl = this.configService.get<string>(
      'TRIGGER_SCRAPPER_URL',
    ) as string
    const statusUrl = this.configService.get<string>(
      'TRIGGER_SCRAPPER_STATUS',
    ) as string
    try {
      const statusResponse = await this.httpService.get(statusUrl).toPromise()

      if (!statusResponse?.data.state) {
        setTimeout(async () => {
          await this.initiateInjest()
        }, 30000)
        return
      }

      await this.httpService.post(scraperUrl).toPromise()
      console.log('Injest action emitted ! ! ⚙️')
    } catch (e: any) {
      console.error(e)
    }
  }
}

export default AutoInjestService
