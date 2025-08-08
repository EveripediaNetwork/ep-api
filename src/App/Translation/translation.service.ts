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

      // Check if content is extremely large and needs special handling
      const contentLength = (wiki.content || '').length
      let translationResult: TranslationResult

      if (contentLength > 12000) {
        this.logger.log(
          `Large content detected (${contentLength} chars) for wiki ${wikiId}, using chunked translation`,
        )
        translationResult = await this.performChunkedTranslation(wiki)
      } else {
        translationResult = await this.performTranslation(wiki)
      }

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

  private async performChunkedTranslation(
    wiki: Wiki,
  ): Promise<TranslationResult> {
    try {
      // Translate title and summary first (they're usually short)
      const titleSummaryContentObj: any = {}
      if (wiki.title) titleSummaryContentObj.title = wiki.title
      if (wiki.summary) titleSummaryContentObj.summary = wiki.summary

      const titleSummaryContent = JSON.stringify(
        titleSummaryContentObj,
        null,
        2,
      )
      const titleSummaryResult =
        await this.translateContent(titleSummaryContent)

      if (!titleSummaryResult.success) {
        return titleSummaryResult
      }

      // Now handle the content in chunks
      const content = wiki.content || ''
      if (content.length === 0) {
        return titleSummaryResult
      }

      // Split content into logical sections
      const sections = this.splitContentIntoSections(content)
      const translatedSections: string[] = []
      let totalCost = titleSummaryResult.cost || 0

      this.logger.log(`Translating content in ${sections.length} sections`)

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        if (section.trim().length === 0) continue

        try {
          const sectionContent = JSON.stringify({ content: section }, null, 2)
          const sectionResult = await this.translateContent(sectionContent)

          if (
            sectionResult.success &&
            sectionResult.translatedContent?.content
          ) {
            translatedSections.push(sectionResult.translatedContent.content)
            totalCost += sectionResult.cost || 0
          } else {
            this.logger.warn(
              `Failed to translate section ${i + 1}, skipping...`,
            )
            // Include original section if translation fails
            translatedSections.push(section)
          }

          // Add small delay between sections to avoid rate limits
          if (i < sections.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        } catch (error) {
          this.logger.error(`Error translating section ${i + 1}:`, error)
          translatedSections.push(section) // Fallback to original
        }
      }

      const combinedContent = translatedSections.join('\n\n')

      return {
        success: true,
        translatedContent: {
          title: titleSummaryResult.translatedContent?.title,
          summary: titleSummaryResult.translatedContent?.summary,
          content: combinedContent,
        },
        provider: 'openai',
        model: this.openaiModel,
        cost: totalCost,
      }
    } catch (error: any) {
      this.logger.error('Error in chunked translation:', error)
      return {
        success: false,
        error: `Chunked translation error: ${error.message || 'Unknown error'}`,
      }
    }
  }

  private async translateContent(
    contentToTranslate: string,
  ): Promise<TranslationResult> {
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
            
            IMPORTANT: You must return ONLY valid JSON in the exact format specified below. Do not include any markdown formatting, explanations, or additional text.
            
            Translation guidelines:
            1. Technical accuracy and proper terminology
            2. Natural Korean language flow
            3. Proper names should remain in their original form with Korean pronunciation in parentheses when appropriate
            4. Preserve the exact JSON structure
            5. Escape all special characters properly in JSON strings
            6. Do not use unescaped quotes, newlines, or backslashes in the JSON values
            7. Preserve markdown formatting, links, widgets, and citations exactly as they appear
            8. Keep special elements like $$widget0 [YOUTUBE@VID](videoId)$$ unchanged
            9. Keep citation links like [[1]](#cite-id-xyz) unchanged
            10. Translate the actual text content while preserving all formatting
            
            Expected JSON format:
            {
              "title": "translated title here",
              "summary": "translated summary here", 
              "content": "translated content with preserved formatting here"
            }
            
            Return ONLY the JSON object, nothing else.`,
          },
          {
            role: 'user',
            content: contentToTranslate,
          },
        ],
        temperature: 0.1,
        max_tokens: 8000,
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
          return {
            success: false,
            error: `OpenAI API authentication failed (401). Please check your API key.`,
          }
        }

        if (error.status === 429) {
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

  private splitContentIntoSections(content: string): string[] {
    // Split by H2 headers first (##)
    const sections = content.split(/(?=##\s)/)

    // If sections are still too large, split further
    const maxSectionLength = 4000
    const finalSections: string[] = []

    for (const section of sections) {
      if (section.length <= maxSectionLength) {
        finalSections.push(section)
      } else {
        // Split large sections by paragraphs
        const paragraphs = section.split(/\n\n+/)
        let currentSection = ''

        for (const paragraph of paragraphs) {
          if (currentSection.length + paragraph.length + 2 > maxSectionLength) {
            if (currentSection.length > 0) {
              finalSections.push(currentSection.trim())
              currentSection = paragraph
            } else {
              // Even a single paragraph is too long, split it
              finalSections.push(paragraph.substring(0, maxSectionLength))
              if (paragraph.length > maxSectionLength) {
                currentSection = paragraph.substring(maxSectionLength)
              }
            }
          } else {
            currentSection += (currentSection ? '\n\n' : '') + paragraph
          }
        }

        if (currentSection.trim().length > 0) {
          finalSections.push(currentSection.trim())
        }
      }
    }

    return finalSections.filter((section) => section.trim().length > 0)
  }

  private async performTranslation(wiki: Wiki): Promise<TranslationResult> {
    const contentToTranslate = this.prepareContentForTranslation(wiki)
    return this.translateContent(contentToTranslate)
  }

  private prepareContentForTranslation(wiki: Wiki): string {
    const contentObj: any = {}

    if (wiki.title) contentObj.title = wiki.title
    if (wiki.summary) contentObj.summary = wiki.summary
    if (wiki.content) {
      // Handle large content by chunking if needed
      const content = wiki.content
      if (content.length > 8000) {
        // For very large content, take the first meaningful sections
        contentObj.content = this.extractMainSections(content)
      } else {
        contentObj.content = content
      }
    }

    return JSON.stringify(contentObj, null, 2)
  }

  private extractMainSections(content: string): string {
    // Extract the introduction and first few sections for translation
    // This ensures we get the most important parts within token limits

    const sections = content.split(/(?=##\s)/) // Split by H2 headers
    let result = ''
    let currentLength = 0
    const maxLength = 6000 // Conservative limit to stay within token limits

    for (const section of sections) {
      if (currentLength + section.length > maxLength) {
        break
      }
      result += section
      currentLength += section.length
    }

    // If we couldn't fit any sections, just take the first part
    if (result.length === 0) {
      result = content.substring(0, maxLength)
      // Try to end at a reasonable point (end of paragraph)
      const lastParagraph = result.lastIndexOf('\n\n')
      if (lastParagraph > maxLength * 0.7) {
        result = result.substring(0, lastParagraph)
      }
    }

    this.logger.log(
      `Content truncated from ${content.length} to ${result.length} characters for translation`,
    )
    return result
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

  private calculateCost(usage?: OpenAI.CompletionUsage): number {
    if (!usage?.prompt_tokens || !usage.completion_tokens) return 0

    // OpenAI pricing for gpt-4o-mini (as of 2024)
    // Input: $0.15 / 1M tokens, Output: $0.60 / 1M tokens
    const costPerInputToken = 0.15 / 1000000
    const costPerOutputToken = 0.6 / 1000000

    const inputCost = usage.prompt_tokens * costPerInputToken
    const outputCost = usage.completion_tokens * costPerOutputToken

    return inputCost + outputCost
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
