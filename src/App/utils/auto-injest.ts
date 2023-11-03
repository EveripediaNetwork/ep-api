import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LockingService } from '../IQHolders/IQHolders.dto'

export const injestId = 'injest.action'
@Injectable()
class AutoInjestService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private lockingService: LockingService,
  ) {}

  private INJEST_KEYS(): string {
    return this.configService.get<string>('INDEXER_GITHUB_TOKEN') as string
  }

  async initiateInjest() {
    const status = await this.checkWorkflowStatus()

    const environment = this.configService.get<string>('API_LEVEL') as string

    const locked = await this.lockingService.acquireLock(injestId)

    if (environment === 'dev' || !locked || !status) return

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
      console.log('Injest action emitted ! ! ⚙️')
    } catch (e) {
      console.error(e)
    }

    setTimeout(() => {
      this.lockingService.releaseLock(injestId)
    }, 30000)
  }

  async checkWorkflowStatus(): Promise<boolean> {
    let status = false
    try {
      const response = await this.httpService
        .get(
          'https://api.github.com/repos/EveripediaNetwork/iq-gpt-ingester-js/actions/workflows/trigger.yml/runs',

          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              Authorization: `token ${this.INJEST_KEYS()}`,
            },
          },
        )
        .toPromise()

      status = response?.data.workflow_runs[0].status === 'completed'
    } catch (e) {
      console.error(e)
    }

    return status
  }
}

export default AutoInjestService
