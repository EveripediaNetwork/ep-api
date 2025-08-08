import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import OpenAI from 'openai'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiKoreanTranslation from '../../Database/Entities/wikiKoreanTranslation.entity'
import {
  BulkTranslationInput,
  TranslatedContent,
  TranslationInput,
  TranslationResult,
  BulkTranslationResult,
} from './translation.dto'

@Injectable()
export default class WikiTranslationService {
  private readonly logger = new Logger(WikiTranslationService.name)

  private readonly openai: OpenAI

  private readonly openaiModel: string

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || ''
    this.openaiModel =
      this.configService.get<string>('OPENAI_TRANSLATION_MODEL') ||
      'gpt-4o-mini'

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey,
    })

    // Debug API key loading
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not set in environment variables')
    } else if (apiKey.length < 20) {
      this.logger.error(
        'OPENAI_API_KEY appears to be too short - may be invalid',
      )
    } else {
      this.logger.log(
        `OPENAI_API_KEY loaded successfully (length: ${
          apiKey.length
        }, starts with: ${apiKey.substring(0, 7)}...)`,
      )
    }
  }

  async translateWiki(request: TranslationInput): Promise<TranslationResult> {
    const { wikiId, forceRetranslate = false } = request

    try {
      const existingTranslation = await this.getExistingTranslation(wikiId)
      if (existingTranslation && !forceRetranslate) {
        this.logger.debug(`Translation already exists for wiki ${wikiId}`)
        return {
          success: true,
          translatedContent: {
            title: existingTranslation.title || undefined,
            summary: existingTranslation.summary || undefined,
            content: existingTranslation.content || undefined,
          },
          provider: existingTranslation.translationProvider || undefined,
          model: existingTranslation.translationModel || undefined,
          cost: existingTranslation.translationCost || undefined,
        }
      }

      const wiki = await this.getWikiContent(wikiId)
      if (!wiki) {
        return {
          success: false,
          error: `Wiki with ID ${wikiId} not found`,
        }
      }

      const translationResult = await this.performTranslation(wiki)
      if (!translationResult.success) {
        await this.saveTranslationError(
          wikiId,
          translationResult.error || 'Unknown error',
        )
        return translationResult
      }

      const hasValidTranslation =
        (translationResult.translatedContent?.title &&
          translationResult.translatedContent.title.trim().length > 0) ||
        (translationResult.translatedContent?.summary &&
          translationResult.translatedContent.summary.trim().length > 0) ||
        (translationResult.translatedContent?.content &&
          translationResult.translatedContent.content.trim().length > 0)

      if (!hasValidTranslation) {
        const errorMsg =
          'Translation API returned success but no meaningful content was translated'
        this.logger.error(`${errorMsg} for wiki ${wikiId}`)
        await this.saveTranslationError(wikiId, errorMsg)
        return {
          success: false,
          error: errorMsg,
        }
      }

      await this.saveTranslation(wikiId, translationResult)

      this.logger.log(`Successfully translated wiki ${wikiId} to Korean`)
      return translationResult
    } catch (error) {
      this.logger.error(`Failed to translate wiki ${wikiId}:`, error)
      await this.saveTranslationError(
        wikiId,
        error instanceof Error ? error.message : 'Unknown error',
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async bulkTranslateWikis(
    request: BulkTranslationInput,
  ): Promise<BulkTranslationResult> {
    const {
      wikiIds,
      batchSize = 5,
      delayMs = 1000,
      forceRetranslate = false,
    } = request

    this.logger.log(`Starting bulk translation of ${wikiIds.length} wikis`)

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ wikiId: string; error: string }>,
    }

    for (let i = 0; i < wikiIds.length; i += batchSize) {
      const batch = wikiIds.slice(i, i + batchSize)

      const batchPromises = batch.map(async (wikiId) => {
        try {
          const result = await this.translateWiki({ wikiId, forceRetranslate })
          results.processed += 1

          if (result.success) {
            results.successful += 1
          } else {
            results.failed += 1
            results.errors.push({
              wikiId,
              error: result.error || 'Unknown error',
            })
          }
        } catch (error) {
          results.processed += 1
          results.failed += 1
          results.errors.push({
            wikiId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      })

      await Promise.all(batchPromises)

      if (i + batchSize < wikiIds.length && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    this.logger.log(
      `Bulk translation completed: ${results.successful} successful, ${results.failed} failed`,
    )

    return results
  }

  async getKoreanTranslation(
    wikiId: string,
  ): Promise<WikiKoreanTranslation | null> {
    const repository = this.dataSource.getRepository(WikiKoreanTranslation)
    return repository.findOne({ where: { wikiId } })
  }

  private async getExistingTranslation(
    wikiId: string,
  ): Promise<WikiKoreanTranslation | null> {
    const repository = this.dataSource.getRepository(WikiKoreanTranslation)
    const translation = await repository.findOne({
      where: {
        wikiId,
        translationStatus: 'completed',
      },
    })

    if (translation) {
      const hasValidContent =
        (translation.title && translation.title.trim().length > 0) ||
        (translation.summary && translation.summary.trim().length > 0) ||
        (translation.content && translation.content.trim().length > 0)

      if (!hasValidContent) {
        this.logger.warn(
          `Found completed translation for wiki ${wikiId} but it has no meaningful content. Will retranslate.`,
        )
        return null
      }
    }

    return translation
  }

  private async getWikiContent(wikiId: string): Promise<Wiki | null> {
    const repository = this.dataSource.getRepository(Wiki)
    return repository.findOne({ where: { id: wikiId } })
  }

  private async performTranslation(wiki: Wiki): Promise<TranslationResult> {
    const contentToTranslate = this.prepareContentForTranslation(wiki)

    if (!contentToTranslate.trim()) {
      return {
        success: false,
        error: 'No content to translate',
      }
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.openaiModel,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specializing in translating Wikipedia-style content to Korean. 
            Translate the provided JSON content accurately while maintaining:
            1. Technical accuracy and proper terminology
            2. Natural Korean language flow
            3. Proper names should remain in their original form with Korean pronunciation in parentheses when appropriate
            4. JSON structure must be preserved exactly

            Return only the translated JSON with the same structure.`,
          },
          {
            role: 'user',
            content: contentToTranslate,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      })

      const translatedContent = completion.choices[0]?.message?.content

      if (!translatedContent) {
        return {
          success: false,
          error: 'No translation received from OpenAI',
        }
      }

      const parsedContent = this.parseTranslatedContent(translatedContent)
      const cost = this.calculateCost(completion.usage)

      // Validate that we got meaningful translated content
      const hasValidContent =
        (parsedContent.title && parsedContent.title.trim().length > 0) ||
        (parsedContent.summary && parsedContent.summary.trim().length > 0) ||
        (parsedContent.content && parsedContent.content.trim().length > 0)

      if (!hasValidContent) {
        this.logger.error(
          'Translation completed but no meaningful content was returned',
        )
        return {
          success: false,
          error: 'Translation completed but no meaningful content was returned',
        }
      }

      return {
        success: true,
        translatedContent: parsedContent,
        provider: 'openai',
        model: this.openaiModel,
        cost,
      }
    } catch (error: any) {
      // Enhanced error logging for OpenAI API issues
      if (error.status) {
        this.logger.error(`OpenAI API Error - Status: ${error.status}`, {
          status: error.status,
          message: error.message,
          type: error.type,
        })

        if (error.status === 401) {
          this.logger.error(
            'Authentication failed - API key may be invalid or expired',
          )
          return {
            success: false,
            error: `OpenAI API authentication failed (401). Please check your API key.`,
          }
        }

        if (error.status === 429) {
          this.logger.error('Rate limit exceeded')
          return {
            success: false,
            error: 'OpenAI API rate limit exceeded. Please try again later.',
          }
        }

        return {
          success: false,
          error: `OpenAI API error (${error.status}): ${
            error.message || 'Unknown error'
          }`,
        }
      }

      this.logger.error(
        'Error with OpenAI API request:',
        error.message || error,
      )
      return {
        success: false,
        error: `Request error: ${error.message || 'Unknown error'}`,
      }
    }
  }

  private prepareContentForTranslation(wiki: Wiki): string {
    const contentObj: any = {}

    if (wiki.title) contentObj.title = wiki.title
    if (wiki.summary) contentObj.summary = wiki.summary
    if (wiki.content) contentObj.content = wiki.content
    if (wiki.tags && wiki.tags.length > 0) contentObj.tags = wiki.tags
    if (wiki.categories && wiki.categories.length > 0) {
      contentObj.categories = wiki.categories.map((cat: any) => ({
        id: cat.id,
        title: cat.title,
      }))
    }

    return JSON.stringify(contentObj, null, 2)
  }

  private parseTranslatedContent(translatedText: string): TranslatedContent {
    try {
      let cleanedText = translatedText.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText
          .replace(/^```json\s*/, '')
          .replace(/\s*```$/, '')
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      const parsed = JSON.parse(cleanedText)

      const result: TranslatedContent = {}

      if (
        parsed.title &&
        typeof parsed.title === 'string' &&
        parsed.title.trim()
      ) {
        result.title = parsed.title.trim()
      }

      if (
        parsed.summary &&
        typeof parsed.summary === 'string' &&
        parsed.summary.trim()
      ) {
        result.summary = parsed.summary.trim()
      }

      if (
        parsed.content &&
        typeof parsed.content === 'string' &&
        parsed.content.trim()
      ) {
        result.content = parsed.content.trim()
      }

      return result
    } catch (error) {
      this.logger.error('Failed to parse translated content:', error)
      this.logger.error('Raw translated text:', translatedText)
      return {}
    }
  }

  private calculateCost(usage?: { total_tokens?: number }): number {
    if (!usage?.total_tokens) return 0

    // OpenAI pricing for gpt-4o-mini (as of 2024)
    // Input: $0.15 / 1M tokens, Output: $0.60 / 1M tokens
    // For simplicity, using average rate of $0.375 / 1M tokens
    const costPerToken = 0.375 / 1000000
    return usage.total_tokens * costPerToken
  }

  private async saveTranslation(
    wikiId: string,
    result: TranslationResult,
  ): Promise<void> {
    const repository = this.dataSource.getRepository(WikiKoreanTranslation)

    const translation =
      (await repository.findOne({ where: { wikiId } })) ||
      repository.create({ wikiId })

    // Validate that we have meaningful translated content
    const hasTitle =
      result.translatedContent?.title &&
      typeof result.translatedContent.title === 'string' &&
      result.translatedContent.title.trim().length > 0
    const hasSummary =
      result.translatedContent?.summary &&
      typeof result.translatedContent.summary === 'string' &&
      result.translatedContent.summary.trim().length > 0
    const hasContent =
      result.translatedContent?.content &&
      typeof result.translatedContent.content === 'string' &&
      result.translatedContent.content.trim().length > 0

    // Only save and mark as completed if we have at least one of the main content fields
    if (!hasTitle && !hasSummary && !hasContent) {
      this.logger.error(
        `Translation failed for wiki ${wikiId}: No meaningful content translated`,
      )
      translation.translationStatus = 'failed'
      translation.errorMessage = 'No meaningful content was translated'
      // Don't overwrite existing successful translations with null values
      await repository.save(translation)
      return
    }

    // Only update fields that have valid translated content
    // Never set title, summary, or content to null if we don't have a valid translation
    if (hasTitle && result.translatedContent?.title) {
      translation.title = result.translatedContent.title.trim()
    }
    if (hasSummary && result.translatedContent?.summary) {
      translation.summary = result.translatedContent.summary.trim()
    }
    if (hasContent && result.translatedContent?.content) {
      translation.content = result.translatedContent.content.trim()
    }

    // Only mark as completed if we successfully saved at least one main content field
    translation.translationStatus = 'completed'
    translation.translationProvider = result.provider || 'openai'
    translation.translationModel = result.model || this.openaiModel
    translation.translationCost = result.cost || 0
    translation.errorMessage = null

    // Log what was successfully translated
    const translatedFields = []
    if (hasTitle) translatedFields.push('title')
    if (hasSummary) translatedFields.push('summary')
    if (hasContent) translatedFields.push('content')

    this.logger.log(
      `Successfully translated ${translatedFields.join(
        ', ',
      )} for wiki ${wikiId}`,
    )

    await repository.save(translation)
  }

  private async saveTranslationError(
    wikiId: string,
    error: string,
  ): Promise<void> {
    const repository = this.dataSource.getRepository(WikiKoreanTranslation)

    const translation =
      (await repository.findOne({ where: { wikiId } })) ||
      repository.create({ wikiId })

    translation.translationStatus = 'failed'
    translation.errorMessage = error

    await repository.save(translation)
  }

  async cleanupInvalidTranslations(): Promise<{
    cleaned: number
    errors: Array<{ wikiId: string; error: string }>
  }> {
    const repository = this.dataSource.getRepository(WikiKoreanTranslation)
    const result = {
      cleaned: 0,
      errors: [] as Array<{ wikiId: string; error: string }>,
    }

    try {
      const completedTranslations = await repository.find({
        where: { translationStatus: 'completed' },
      })

      for (const translation of completedTranslations) {
        const hasValidContent =
          (translation.title && translation.title.trim().length > 0) ||
          (translation.summary && translation.summary.trim().length > 0) ||
          (translation.content && translation.content.trim().length > 0)

        if (!hasValidContent) {
          try {
            translation.translationStatus = 'failed'
            translation.errorMessage =
              'Translation marked as completed but contains no meaningful content'
            await repository.save(translation)
            result.cleaned += 1
            this.logger.log(
              `Cleaned up invalid translation for wiki ${translation.wikiId}`,
            )
          } catch (error) {
            result.errors.push({
              wikiId: translation.wikiId,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }

      this.logger.log(
        `Cleanup completed: ${result.cleaned} invalid translations cleaned up`,
      )
      return result
    } catch (error) {
      this.logger.error('Error during translation cleanup:', error)
      throw error
    }
  }

  async getTranslationStats(): Promise<{
    totalTranslations: number
    pendingTranslations: number
    completedTranslations: number
    failedTranslations: number
    totalCost: number
  }> {
    const repository = this.dataSource.getRepository(WikiKoreanTranslation)

    const [
      totalTranslations,
      pendingTranslations,
      completedTranslations,
      failedTranslations,
    ] = await Promise.all([
      repository.count(),
      repository.count({ where: { translationStatus: 'pending' } }),
      repository.count({ where: { translationStatus: 'completed' } }),
      repository.count({ where: { translationStatus: 'failed' } }),
    ])

    const costResult = await repository
      .createQueryBuilder('translation')
      .select('SUM(translation.translationCost)', 'totalCost')
      .getRawOne()

    return {
      totalTranslations,
      pendingTranslations,
      completedTranslations,
      failedTranslations,
      totalCost: parseFloat(costResult?.totalCost || '0'),
    }
  }
}
