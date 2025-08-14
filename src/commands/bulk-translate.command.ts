import { Command, CommandRunner, Option } from 'nest-commander'
import { Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import WikiTranslationService from '../App/Translation/translation.service'
import Wiki from '../Database/Entities/wiki.entity'

interface BulkTranslateOptions {
  limit?: number // 0 = no limit (translate all), >0 = limit to that number
  offset?: number // Skip this many wikis (useful for resuming)
  batchSize?: number // How many to process in parallel
  delayMs?: number // Delay between batches
  forceRetranslate?: boolean // Retranslate even if translation exists
  wikiIds?: string // Comma-separated specific wiki IDs to translate
}

@Command({
  name: 'translate:bulk-korean',
  description: 'Bulk translate wikis to Korean',
})
export default class BulkTranslateCommand implements CommandRunner {
  private readonly logger = new Logger(BulkTranslateCommand.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly translationService: WikiTranslationService,
  ) {}

  async run(
    passedParams: string[],
    options?: BulkTranslateOptions,
  ): Promise<void> {
    const {
      limit = 0, // 0 means no limit - translate all wikis
      offset = 0,
      batchSize = 5,
      delayMs = 1000,
      forceRetranslate = false,
      wikiIds,
    } = options || {}

    this.logger.log('🚀 Starting bulk Korean translation...')

    try {
      let targetWikiIds: string[]

      if (wikiIds) {
        targetWikiIds = wikiIds
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
        this.logger.log(`📝 Translating ${targetWikiIds.length} specific wikis`)
      } else {
        const wikiRepository = this.dataSource.getRepository(Wiki)

        // First, get total count for logging
        const totalCount = await wikiRepository
          .createQueryBuilder('wiki')
          .where('wiki.content IS NOT NULL')
          .andWhere('wiki.summary IS NOT NULL')
          .andWhere('wiki.hidden = false') // Only translate visible wikis
          .getCount()

        this.logger.log(`📊 Found ${totalCount} total wikis with content`)

        // Get count of wikis that need translation (excluding already translated ones)
        const needTranslationCount = await wikiRepository
          .createQueryBuilder('wiki')
          .leftJoin('wiki_korean_translations', 'kt', 'kt.wiki_id = wiki.id')
          .where('wiki.content IS NOT NULL')
          .andWhere('wiki.summary IS NOT NULL')
          .andWhere('wiki.hidden = false')
          .andWhere('kt.wiki_id IS NULL') // No existing translation
          .getCount()

        this.logger.log(
          `🔄 Found ${needTranslationCount} wikis that need translation`,
        )

        let query = wikiRepository
          .createQueryBuilder('wiki')
          .select(['wiki.id'])
          .leftJoin('wiki_korean_translations', 'kt', 'kt.wiki_id = wiki.id')
          .where('wiki.content IS NOT NULL')
          .andWhere('wiki.summary IS NOT NULL')
          .andWhere('wiki.hidden = false')
          .andWhere('kt.wiki_id IS NULL') // Exclude wikis that already have translations
          .orderBy('wiki.created', 'DESC')
          .offset(offset)

        // Only apply limit if it's greater than 0
        if (limit > 0) {
          query = query.limit(limit)
          this.logger.log(
            `⚡ Limiting to ${limit} wikis (starting from offset ${offset})`,
          )
        } else {
          this.logger.log(
            `🌟 Translating ALL wikis (starting from offset ${offset})`,
          )
        }

        const wikis = await query.getMany()
        targetWikiIds = wikis.map((wiki) => wiki.id)

        this.logger.log(
          `✅ Selected ${targetWikiIds.length} wikis to translate`,
        )
      }

      if (targetWikiIds.length === 0) {
        this.logger.warn('⚠️ No wikis found to translate')
        return
      }

      const result = await this.translationService.bulkTranslateWikis({
        wikiIds: targetWikiIds,
        batchSize,
        delayMs,
        forceRetranslate,
      })

      this.logger.log('🎉 Bulk translation completed!')
      this.logger.log(
        `📈 Results: ${result.successful} successful, ${result.failed} failed`,
      )

      if (result.errors.length > 0) {
        this.logger.error('❌ Errors occurred:')
        result.errors.forEach((error) => {
          this.logger.error(`   Wiki ${error.wikiId}: ${error.error}`)
        })
      }

      const stats = await this.translationService.getTranslationStats()
      this.logger.log('📊 Current translation statistics:')
      this.logger.log(`   Total translations: ${stats.totalTranslations}`)
      this.logger.log(`   Completed: ${stats.completedTranslations}`)
      this.logger.log(`   Failed: ${stats.failedTranslations}`)
      this.logger.log(`   Pending: ${stats.pendingTranslations}`)
      this.logger.log(`   Total cost: $${stats.totalCost.toFixed(4)}`)
    } catch (error) {
      this.logger.error('💥 Bulk translation failed:', error)
      throw error
    }

    process.exit(0)
  }

  @Option({
    flags: '-l, --limit <number>',
    description: 'Maximum number of wikis to translate (0 = all)',
  })
  parseLimit(value: string): number {
    return parseInt(value, 10) || 0
  }

  @Option({
    flags: '-o, --offset <number>',
    description: 'Skip this many wikis (useful for resuming)',
  })
  parseOffset(value: string): number {
    return parseInt(value, 10) || 0
  }

  @Option({
    flags: '-b, --batch-size <number>',
    description: 'Number of translations to process in parallel',
  })
  parseBatchSize(value: string): number {
    return parseInt(value, 10) || 5
  }

  @Option({
    flags: '-d, --delay-ms <number>',
    description: 'Delay between batches in milliseconds',
  })
  parseDelayMs(value: string): number {
    return parseInt(value, 10) || 1000
  }

  @Option({
    flags: '-f, --force-retranslate',
    description: 'Force retranslation of existing translations',
  })
  parseForceRetranslate(): boolean {
    return true
  }

  @Option({
    flags: '-w, --wiki-ids <string>',
    description: 'Comma-separated specific wiki IDs to translate',
  })
  parseWikiIds(value: string): string {
    return value
  }
}
