import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'

const watchIds = ['iqwiki']

@Injectable()
class AutoInjestService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  private INJEST_KEYS(): string {
    return this.configService.get<string>('INDEXER_GITHUB_TOKEN') as string
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async initiateInjest(id: string) {
    if (!watchIds.includes(id)) return

    const injestURL =
      'https://api.github.com/repos/EveripediaNetwork/iq-gpt-ingester-js/dispatches'

    try {
      await this.httpService
        .get(injestURL, {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `token ${this.INJEST_KEYS()}`,
          },
        })
        .toPromise()
    } catch (e: any) {
      console.error('Error initiating the injest action', e)
    }
  }
}

export default AutoInjestService
