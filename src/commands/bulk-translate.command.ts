import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import WikiTranslationService from '../App/Translation/translation.service'
import Wiki from '../Database/Entities/wiki.entity'

interface BulkTranslateOptions {
  limit?: number
  offset?: number
  batchSize?: number
  delayMs?: number
  forceRetranslate?: boolean
  wikiIds?: string
}

@Injectable()
export default class BulkTranslateCommand {
  private readonly logger = new Logger(BulkTranslateCommand.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly translationService: WikiTranslationService,
  ) {}

  async run(options: BulkTranslateOptions = {}): Promise<void> {
    const {
      limit = 100,
      offset = 0,
      batchSize = 5,
      delayMs = 1000,
      forceRetranslate = false,
      wikiIds,
    } = options

    this.logger.log('Starting bulk Korean translation...')

    try {
      let targetWikiIds: string[]

      if (wikiIds) {
        targetWikiIds = wikiIds
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
        this.logger.log(`Translating ${targetWikiIds.length} specific wikis`)
      } else {
        const wikiRepository = this.dataSource.getRepository(Wiki)

        const wikis = await wikiRepository
          .createQueryBuilder('wiki')
          .select(['wiki.id'])
          .where('wiki.content IS NOT NULL')
          .andWhere('wiki.title IS NOT NULL')
          .orderBy('wiki.created', 'DESC')
          .limit(limit)
          .offset(offset)
          .getMany()

        targetWikiIds = wikis.map((wiki) => wiki.id)
        this.logger.log(
          `Found ${targetWikiIds.length} wikis to translate (limit: ${limit}, offset: ${offset})`,
        )
      }

      if (targetWikiIds.length === 0) {
        this.logger.warn('No wikis found to translate')
        return
      }

      const result = await this.translationService.bulkTranslateWikis({
        wikiIds: targetWikiIds,
        batchSize,
        delayMs,
        forceRetranslate,
      })

      this.logger.log('Bulk translation completed!')
      this.logger.log(
        `Results: ${result.successful} successful, ${result.failed} failed`,
      )

      if (result.errors.length > 0) {
        this.logger.warn('Errors occurred:')
        result.errors.forEach((error) => {
          this.logger.warn(`Wiki ${error.wikiId}: ${error.error}`)
        })
      }

      // Display final stats
      const stats = await this.translationService.getTranslationStats()
      this.logger.log('Current translation statistics:')
      this.logger.log(`Total translations: ${stats.totalTranslations}`)
      this.logger.log(`Completed: ${stats.completedTranslations}`)
      this.logger.log(`Failed: ${stats.failedTranslations}`)
      this.logger.log(`Pending: ${stats.pendingTranslations}`)
      this.logger.log(`Total cost: $${stats.totalCost.toFixed(4)}`)
    } catch (error) {
      this.logger.error('Bulk translation failed:', error)
      throw error
    }
  }
}
