import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'

export const ingestId = 'ingest.action'
@Injectable()
class AutoIngestService {
  private readonly logger = new Logger(AutoIngestService.name)

  private readonly RETRY_DELAY_MS = 30000 // 30 seconds

  private isRunning = false

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async initiateIngest(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('Ingest already running, skipping duplicate request')
      return
    }

    this.isRunning = true

    try {
      const scraperUrl = this.configService.get<string>(
        'TRIGGER_SCRAPPER_URL',
      ) as string
      const statusUrl = this.configService.get<string>(
        'TRIGGER_SCRAPPER_STATUS',
      ) as string

      if (!scraperUrl || !statusUrl) {
        this.logger.error('Scraper URL or Status URL not configured')
        this.isRunning = false
        return
      }

      const statusResponse = await firstValueFrom(
        this.httpService.get(statusUrl),
      )

      if (!statusResponse?.data?.state) {
        this.logger.debug('Scraper not ready, retrying in 30 seconds')
        setTimeout(() => {
          this.isRunning = false
          this.initiateIngest()
        }, this.RETRY_DELAY_MS)
        return
      }

      await firstValueFrom(this.httpService.post(scraperUrl))
      this.logger.log('Ingest action triggered successfully ⚙️')
      this.isRunning = false
    } catch (error: any) {
      this.logger.error('Failed to initiate ingest action:', error?.message)
      this.isRunning = false
      throw error
    }
  }
}

export default AutoIngestService
