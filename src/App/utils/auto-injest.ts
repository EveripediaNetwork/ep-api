import { HttpService } from '@nestjs/axios'
import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import { OnEvent } from '@nestjs/event-emitter'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'

export const injestId = 'injest.action'
@Injectable()
class AutoInjestService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private INJEST_KEYS(): string {
    return this.configService.get<string>('INDEXER_GITHUB_TOKEN') as string
  }

  @OnEvent(injestId, { async: true })
  async initiateInjest() {
    const key = await this.cacheManager.get(injestId)

    const environment = this.configService.get<string>('API_LEVEL') as string

    
    if (environment === 'dev' || !firstLevelNodeProcess() || key) return

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
      console.log('Injest action emitted! ⚙️')
    } catch (e) {
      console.error(e)
    }

    await this.cacheManager.set(injestId, true, { ttl: 60 })
  }
}

export default AutoInjestService
