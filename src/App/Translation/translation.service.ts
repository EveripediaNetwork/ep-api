import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
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

  private readonly googleModel: string

  private readonly baseUrl: string

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('WEBSITE_URL') || ''
    this.googleModel =
      this.configService.get<string>('GOOGLE_MODEL') || 'gemini-1.5-flash'

    const googleApiKey =
      this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY') ||
      ''
    if (!googleApiKey) {
      this.logger.error(
        'GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables',
      )
    } else if (googleApiKey.length < 20) {
      this.logger.error(
        'GOOGLE_GENERATIVE_AI_API_KEY appears to be too short - may be invalid',
      )
    } else {
      this.logger.log(
        `GOOGLE_GENERATIVE_AI_API_KEY loaded successfully (length: ${
          googleApiKey.length
        }, starts with: ${googleApiKey.substring(0, 7)}...)`,
      )
    }
  }

  async translateWiki(request: TranslationInput): Promise<TranslationResult> {
    const { wikiId, forceRetranslate = false } = request

    if (this.baseUrl?.includes('dev')) {
      this.logger.warn(
        `Translation skipped for wiki ${wikiId} - running in dev environment`,
      )
      return {
        success: false,
        error: 'Translation disabled in development environment',
      }
    }

    try {
      const existingTranslation = await this.getExistingTranslation(wikiId)
      if (existingTranslation && !forceRetranslate) {
        this.logger.debug(`Translation already exists for wiki ${wikiId}`)
        return {
          success: true,
          translatedContent: {
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
        // Don't save anything to database if translation fails
        this.logger.error(
          `Translation failed for wiki ${wikiId}: ${translationResult.error}`,
        )
        return translationResult
      }

      const hasValidTranslation =
        (translationResult.translatedContent?.summary &&
          translationResult.translatedContent.summary.trim().length > 0) ||
        (translationResult.translatedContent?.content &&
          translationResult.translatedContent.content.trim().length > 0)

      if (!hasValidTranslation) {
        const errorMsg =
          'Translation API returned success but no meaningful content was translated'
        this.logger.error(`${errorMsg} for wiki ${wikiId}`)
        // Don't save anything to database if no meaningful content was translated
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
      // Don't save error to database - just return the error
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
      // Translate summary first (usually short)
      const summaryContentObj: any = {}
      if (wiki.summary) {
        summaryContentObj.summary = this.preProcessContent(wiki.summary)
      }

      const summaryContent = JSON.stringify(summaryContentObj, null, 2)
      const summaryResult =
        await this.translateContentWithFallback(summaryContent)

      if (!summaryResult.success) {
        return summaryResult
      }

      // Now handle the content in chunks
      const content = wiki.content || ''
      if (content.length === 0) {
        return summaryResult
      }

      // Preprocess the content before splitting
      const preprocessedContent = this.preProcessContent(content)

      // Split content into logical sections
      const sections = this.splitContentIntoSections(preprocessedContent)
      const translatedSections: string[] = []
      let totalCost = summaryResult.cost || 0

      this.logger.log(`Translating content in ${sections.length} sections`)

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        if (section.trim().length === 0) continue

        try {
          const sectionContent = JSON.stringify({ content: section }, null, 2)
          const sectionResult =
            await this.translateContentWithFallback(sectionContent)

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
          // Don't translate title - keep original
          summary: summaryResult.translatedContent?.summary,
          content: combinedContent,
        },
        provider: summaryResult.provider || 'google',
        model: summaryResult.model || this.googleModel,
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

  private async translateContentWithFallback(
    contentToTranslate: string,
  ): Promise<TranslationResult> {
    return this.translateContentWithGoogle(contentToTranslate)
  }

  private async translateContentWithGoogle(
    contentToTranslate: string,
  ): Promise<TranslationResult> {
    if (!contentToTranslate.trim()) {
      return {
        success: false,
        error: 'No content to translate',
      }
    }

    // Check if Google API key is available
    const googleApiKey =
      this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY') ||
      ''

    if (!googleApiKey) {
      return {
        success: false,
        error:
          'Google API key is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY environment variable.',
      }
    }

    try {
      const prompt = `You are a professional translator specializing in translating Wikipedia-style content to Korean. 

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
  "summary": "translated summary here", 
  "content": "translated content with preserved formatting here"
}

Note: Do not translate titles - only translate summary and content fields.
Return ONLY the JSON object, nothing else.

Content to translate:
${contentToTranslate}`

      const { text: translatedContent } = await generateText({
        model: google(this.googleModel),
        temperature: 0,
        prompt,
      })

      if (!translatedContent) {
        return {
          success: false,
          error: 'No translation received from Google AI',
        }
      }

      const parsedContent = this.parseTranslatedContent(translatedContent)

      return {
        success: true,
        translatedContent: parsedContent,
        provider: 'google',
        model: this.googleModel,
        cost: 0, // Google AI SDK doesn't provide usage info in the same way
      }
    } catch (error: any) {
      this.logger.error('Error with Google AI request:', error.message || error)

      // Enhanced error logging for Google AI API issues
      if (error.status === 401 || error.message?.includes('API key')) {
        return {
          success: false,
          error:
            'Google AI API authentication failed. Please check your API key.',
        }
      }

      if (error.status === 429) {
        return {
          success: false,
          error: 'Google AI API rate limit exceeded. Please try again later.',
        }
      }

      return {
        success: false,
        error: `Google AI request error: ${error.message || 'Unknown error'}`,
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

    this.logger.log(`Translating wiki ${wiki.id} with Google AI`)
    return this.translateContentWithGoogle(contentToTranslate)
  }

  private prepareContentForTranslation(wiki: Wiki): string {
    const contentObj: any = {}

    // Only translate summary and content, not title
    if (wiki.summary) {
      contentObj.summary = this.preProcessContent(wiki.summary)
    }
    if (wiki.content) {
      // Handle large content by chunking if needed
      const content = wiki.content
      if (content.length > 8000) {
        // For very large content, take the first meaningful sections
        contentObj.content = this.preProcessContent(
          this.extractMainSections(content),
        )
      } else {
        contentObj.content = this.preProcessContent(content)
      }
    }

    return JSON.stringify(contentObj, null, 2)
  }

  private extractMainSections(content: string): string {
    // Preprocess the content first
    const preprocessedContent = this.preProcessContent(content)

    // Extract the introduction and first few sections for translation
    // This ensures we get the most important parts within token limits

    const sections = preprocessedContent.split(/(?=##\s)/) // Split by H2 headers
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
      result = preprocessedContent.substring(0, maxLength)
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

  private async saveTranslation(
    wikiId: string,
    result: TranslationResult,
  ): Promise<void> {
    const repository = this.dataSource.getRepository(WikiKoreanTranslation)

    // Validate that we have meaningful translated content before even attempting to save
    const hasSummary =
      result.translatedContent?.summary &&
      typeof result.translatedContent.summary === 'string' &&
      result.translatedContent.summary.trim().length > 0
    const hasContent =
      result.translatedContent?.content &&
      typeof result.translatedContent.content === 'string' &&
      result.translatedContent.content.trim().length > 0

    // Don't save anything if we don't have meaningful content
    if (!hasSummary && !hasContent) {
      this.logger.error(
        `Cannot save translation for wiki ${wikiId}: No meaningful content to save`,
      )
      throw new Error('No meaningful content was translated')
    }

    const translation =
      (await repository.findOne({ where: { wikiId } })) ||
      repository.create({ wikiId })

    // Only update fields that have valid translated content
    if (hasSummary && result.translatedContent?.summary) {
      translation.summary = result.translatedContent.summary.trim()
    }
    if (hasContent && result.translatedContent?.content) {
      translation.content = result.translatedContent.content.trim()
    }

    // Only mark as completed if we successfully have at least one main content field
    translation.translationStatus = 'completed'
    translation.translationProvider = result.provider || 'google'
    translation.translationModel = result.model || this.googleModel
    translation.translationCost = result.cost || 0
    translation.errorMessage = null

    // Log what was successfully translated
    const translatedFields = []
    if (hasSummary) translatedFields.push('summary')
    if (hasContent) translatedFields.push('content')

    this.logger.log(
      `Successfully translated ${translatedFields.join(
        ', ',
      )} for wiki ${wikiId}`,
    )

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

  async getKoreanWikiIds(): Promise<{ id: string; updated: Date }[]> {
    const repository = this.dataSource.getRepository(WikiKoreanTranslation)

    const translations = await repository.find({
      where: {
        translationStatus: 'completed',
        wiki: {
          hidden: false,
        },
      },
      relations: ['wiki'],
      select: {
        wikiId: true,
        wiki: {
          updated: true,
        },
      },
    })

    const validTranslations = translations.map((translation) => ({
      id: translation.wikiId,
      updated: translation.wiki.updated,
    }))

    return validTranslations
  }

  // Content preprocessing utility
  private preProcessContent(content: string, isEditor = false): string {
    // Replace <br> tags with newlines
    let sanitizedContent = content.replace(/<br( )*\/?>/g, '\n') || ''

    // Handle widget content that's inside headers (This is a edge case in some old wikis)
    sanitizedContent = sanitizedContent.replace(
      /^(#+)\s*(\$\$widget\d.*?\$\$)(.*$)/gm,
      '$2\n$1 $3',
    )

    // Auto-convert either of \[text] - (url) or \\[text] - (url) to '[text](url)' for markdown links in quotes
    sanitizedContent = sanitizedContent.replace(
      /\\{1,2}\[([^\]]+)\]\s*-\s*\(([^)\s]+)\)/g,
      '[$1]($2)',
    )

    // Handle regular widget content
    const matchRegex = /\$\$widget\d(.*?\))\$\$/
    const matches = sanitizedContent.match(new RegExp(matchRegex, 'g')) ?? []

    for (const match of matches) {
      const widgetContent = match.match(matchRegex)?.[1]
      if (widgetContent) {
        sanitizedContent = sanitizedContent.replaceAll(
          match,
          `\n\n${widgetContent}\n\n`,
        )
      }
    }

    // Add newline before list items that don't have proper spacing
    sanitizedContent = sanitizedContent.replace(
      /([^\\-\s](?<!\\))-\s/g,
      '$1\n- ',
    )

    // If there are # (h1) headings, level down all headings by 1
    if (sanitizedContent.includes('\n# ') && !isEditor) {
      sanitizedContent = sanitizedContent
        .replace(/^##### /gm, '###### ')
        .replace(/^#### /gm, '##### ')
        .replace(/^### /gm, '#### ')
        .replace(/^## /gm, '### ')
        .replace(/^# /gm, '## ')
    }

    return sanitizedContent
  }
}
