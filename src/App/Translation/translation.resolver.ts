import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { Logger } from '@nestjs/common'
import WikiTranslationService from './translation.service'
import {
  TranslationInput,
  TranslationResponse,
  TranslatedContent,
  TranslationMetadata,
} from './translation.dto'

@Resolver(() => TranslationResponse)
export default class WikiTranslationResolver {
  private readonly logger = new Logger(WikiTranslationResolver.name)

  constructor(private readonly translationService: WikiTranslationService) {}

  @Mutation(() => TranslationResponse, { nullable: true })
  async translateWiki(
    @Args('input') input: TranslationInput,
  ): Promise<TranslationResponse> {
    if (!input.wikiId?.trim()) {
      return {
        success: false,
        error: 'Wiki ID is required',
      }
    }

    try {
      const existingTranslation = await this.translationService.getTranslation(
        input.wikiId,
        input.targetLanguage,
      )

      if (
        existingTranslation &&
        existingTranslation.translationStatus === 'completed'
      ) {
        const hasValidContent =
          (existingTranslation.summary &&
            existingTranslation.summary.trim().length > 0) ||
          (existingTranslation.content &&
            existingTranslation.content.trim().length > 0)

        if (hasValidContent && !input.forceRetranslate) {
          this.logger.log(
            `Returning existing translation for wiki ${input.wikiId}`,
          )

          const translatedContent: TranslatedContent = {
            summary: existingTranslation.summary || undefined,
            content: existingTranslation.content || undefined,
          }

          const metadata: TranslationMetadata = {
            provider: existingTranslation.translationProvider || undefined,
            model: existingTranslation.translationModel || undefined,
            cost: existingTranslation.translationCost || undefined,
            cached: true,
          }

          return {
            success: true,
            data: translatedContent,
            metadata,
          }
        }
      }

      const result = await this.translationService.translateWiki({
        wikiId: input.wikiId,
        forceRetranslate: input.forceRetranslate,
        targetLanguage: input.targetLanguage,
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        }
      }

      const translatedContent: TranslatedContent = {
        summary: result.translatedContent?.summary,
        content: result.translatedContent?.content,
      }

      const metadata: TranslationMetadata = {
        provider: result.provider,
        model: result.model,
        cost: result.cost,
        cached: false,
      }

      return {
        success: true,
        data: translatedContent,
        metadata,
      }
    } catch (error) {
      this.logger.error(`Translation failed for wiki ${input.wikiId}:`, error)

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Translation service error',
      }
    }
  }

  @Mutation(() => TranslationResponse)
  async retranslateWiki(
    @Args('input') input: TranslationInput,
  ): Promise<TranslationResponse> {
    return this.translateWiki({
      wikiId: input.wikiId,
      forceRetranslate: true,
      targetLanguage: input.targetLanguage,
    })
  }
}
