import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { generateObject, jsonSchema } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import Wiki from '../../Database/Entities/wiki.entity'
import WikiKoreanTranslation from '../../Database/Entities/wikiKoreanTranslation.entity'
import {
  BulkTranslationInput,
  TranslationInput,
  TranslationResult,
  BulkTranslationResult,
} from './translation.dto'

const translationSchema = jsonSchema<{
  summary: string
  content: string
}>({
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'A concise summary of the wiki content in Korean',
    },
    content: {
      type: 'string',
      description:
        'The full translated wiki content in Korean, preserving formatting and special elements',
    },
  },
  required: ['summary', 'content'],
  additionalProperties: false,
})

@Injectable()
export default class WikiTranslationService {
  private readonly logger = new Logger(WikiTranslationService.name)

  private readonly baseUrl: string

  private readonly model: string

  private readonly openrouter: ReturnType<typeof createOpenRouter>

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('WEBSITE_URL') || ''
    this.model =
      this.configService.get<string>('OPENROUTER_MODEL') ||
      'google/gemini-flash-1.5'

    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY') || ''
    if (!apiKey) {
      this.logger.error(
        'OPENROUTER_API_KEY is not set in environment variables',
      )
    }

    this.openrouter = createOpenRouter({ apiKey })
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
            summary: existingTranslation.summary ?? undefined,
            content: existingTranslation.content ?? undefined,
          },
          provider: existingTranslation.translationProvider ?? undefined,
          model: existingTranslation.translationModel ?? undefined,
          cost: existingTranslation.translationCost ?? undefined,
        }
      }

      const wiki = await this.getWikiContent(wikiId)
      if (!wiki) {
        return { success: false, error: `Wiki with ID ${wikiId} not found` }
      }

      const contentLength = (wiki.content || '').length
      const translationResult =
        contentLength > 12000
          ? await this.performChunkedTranslation(wiki)
          : await this.performTranslation(wiki)

      if (!translationResult.success) return translationResult

      await this.saveTranslation(wikiId, translationResult)
      this.logger.log(`Successfully translated wiki ${wikiId} to Korean`)
      return translationResult
    } catch (error) {
      this.logger.error(`Failed to translate wiki ${wikiId}:`, error)
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

      await Promise.all(
        batch.map(async (wikiId) => {
          try {
            const result = await this.translateWiki({
              wikiId,
              forceRetranslate,
            })
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
        }),
      )

      if (i + batchSize < wikiIds.length && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    this.logger.log(
      `Bulk translation completed: ${results.successful} successful, ${results.failed} failed`,
    )

    return results
  }

  private async performTranslation(wiki: Wiki): Promise<TranslationResult> {
    const contentToTranslate = this.prepareContentForTranslation(wiki)
    this.logger.log(`Translating wiki ${wiki.id} with OpenRouter`)

    try {
      const { object } = await generateObject({
        model: this.openrouter(this.model),
        schema: translationSchema,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specializing in translating Wikipedia-style content to Korean.
Translate summary and content fields while preserving all formatting, links, citations, and widgets.`,
          },
          {
            role: 'user',
            content: contentToTranslate,
          },
        ],
      })

      return {
        success: true,
        translatedContent: object,
        provider: 'openrouter',
        model: this.model,
        cost: 0,
      }
    } catch (error: any) {
      this.logger.error('Error with OpenRouter translation:', error)
      return {
        success: false,
        error: `OpenRouter request error: ${error.message || 'Unknown error'}`,
      }
    }
  }

  private async performChunkedTranslation(
    wiki: Wiki,
  ): Promise<TranslationResult> {
    const summaryContent = wiki.summary
      ? this.preProcessContent(wiki.summary)
      : ''
    const preprocessedContent = this.preProcessContent(wiki.content || '')
    const sections = this.splitContentIntoSections(preprocessedContent)

    this.logger.log(`Translating content in ${sections.length} sections`)

    const translatedSections: string[] = []
    let summaryTranslated = ''
    for (let i = 0; i < sections.length; i += 1) {
      try {
        const { object } = await generateObject({
          model: this.openrouter(this.model),
          schema: translationSchema,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: 'Translate summary and content into Korean.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                summary: i === 0 ? summaryContent : '',
                content: sections[i],
              }),
            },
          ],
        })

        if (i === 0 && object.summary) summaryTranslated = object.summary
        if (object.content) translatedSections.push(object.content)
      } catch (error) {
        this.logger.error(`Error translating section ${i + 1}:`, error)
        translatedSections.push(sections[i]) // fallback to original
      }

      if (i < sections.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    return {
      success: true,
      translatedContent: {
        summary: summaryTranslated,
        content: translatedSections.join('\n\n'),
      },
      provider: 'openrouter',
      model: this.model,
      cost: 0,
    }
  }

  private async getExistingTranslation(
    wikiId: string,
  ): Promise<WikiKoreanTranslation | null> {
    const repository = this.dataSource.getRepository(WikiKoreanTranslation)
    const translation = await repository.findOne({
      where: { wikiId, translationStatus: 'completed' },
    })
    return translation || null
  }

  private async getWikiContent(wikiId: string): Promise<Wiki | null> {
    return this.dataSource
      .getRepository(Wiki)
      .findOne({ where: { id: wikiId } })
  }

  private splitContentIntoSections(content: string): string[] {
    const sections = content.split(/(?=##\s)/)
    const maxSectionLength = 4000
    const finalSections: string[] = []
    for (const section of sections) {
      if (section.length <= maxSectionLength) {
        finalSections.push(section)
      } else {
        const paragraphs = section.split(/\n\n+/)
        let current = ''
        for (const p of paragraphs) {
          if (current.length + p.length + 2 > maxSectionLength) {
            finalSections.push(current)
            current = p
          } else {
            current += (current ? '\n\n' : '') + p
          }
        }
        if (current) finalSections.push(current)
      }
    }
    return finalSections
  }

  private prepareContentForTranslation(wiki: Wiki): string {
    return JSON.stringify(
      {
        summary: wiki.summary ? this.preProcessContent(wiki.summary) : '',
        content: wiki.content ? this.preProcessContent(wiki.content) : '',
      },
      null,
      2,
    )
  }

  private preProcessContent(content: string, isEditor = false): string {
    let sanitized = content.replace(/<br\s*\/?>/g, '\n') || ''
    sanitized = sanitized.replace(
      /^(#+)\s*(\$\$widget\d.*?\$\$)(.*$)/gm,
      '$2\n$1 $3',
    )
    sanitized = sanitized.replace(
      /\\{1,2}\[([^\]]+)\]\s*-\s*\(([^)\s]+)\)/g,
      '[$1]($2)',
    )
    sanitized = sanitized.replace(/([^\\-\s](?<!\\))-\s/g, '$1\n- ')
    if (sanitized.includes('\n# ') && !isEditor) {
      sanitized = sanitized
        .replace(/^##### /gm, '###### ')
        .replace(/^#### /gm, '##### ')
        .replace(/^### /gm, '#### ')
        .replace(/^## /gm, '### ')
        .replace(/^# /gm, '## ')
    }
    return sanitized
  }

  private async saveTranslation(
    wikiId: string,
    result: TranslationResult,
  ): Promise<void> {
    const repository = this.dataSource.getRepository(WikiKoreanTranslation)
    const translation =
      (await repository.findOne({ where: { wikiId } })) ||
      repository.create({ wikiId })

    translation.summary = result.translatedContent?.summary?.trim() || ''
    translation.content = result.translatedContent?.content?.trim() || ''
    translation.translationStatus = 'completed'
    translation.translationProvider = result.provider || 'openrouter'
    translation.translationModel = result.model || this.model
    translation.translationCost = result.cost || 0
    translation.errorMessage = null

    await repository.save(translation)
  }
}
