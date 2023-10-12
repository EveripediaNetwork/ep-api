import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'

@Injectable()
class AutoInjestService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  private INJEST_KEYS(): string {
    return this.configService.get<string>('INDEXER_GITHUB_TOKEN') as string
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async initiateInjest() {
    try {
      const payload = {
        event_type: 'trigger-scraper',
        client_payload: {
          scraperName: 'IQ Wiki',
        },
      }

    await this.httpService
        .post(
          'https://api.github.com/repos/EveripediaNetwork/iq-gpt-ingester-js/dispatches',
          payload,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              Authorization: `token ${this.INJEST_KEYS()}`,
            },
          },
        )
        .toPromise()
    } catch (e) {
      console.error(e)
    }
  }
}

export default AutoInjestService
