import {
  Field,
  ObjectType,
  InputType,
  Int,
  Float,
  registerEnumType,
} from '@nestjs/graphql'
import { jsonSchema } from 'ai'

export const createTranslationSchema = (targetLanguage: string) =>
  jsonSchema<{
    summary: string
    content: string
  }>({
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: `A concise summary of the wiki content in ${targetLanguage}`,
      },
      content: {
        type: 'string',
        description: `The full translated wiki content in ${targetLanguage}, preserving formatting and special elements`,
      },
    },
    required: ['summary', 'content'],
    additionalProperties: false,
  })

export enum TranslationLanguage {
  KOREAN = 'Korean',
  CHINESE = 'Chinese',
}

registerEnumType(TranslationLanguage, { name: 'TranslationLanguage' })

@InputType()
export class TranslationInput {
  @Field(() => String)
  wikiId!: string

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  forceRetranslate?: boolean

  @Field(() => TranslationLanguage, {
    nullable: true,
    defaultValue: TranslationLanguage.KOREAN,
  })
  targetLanguage!: TranslationLanguage
}

@InputType()
export class BulkTranslationInput {
  @Field(() => [String])
  wikiIds!: string[]

  @Field(() => Int, { nullable: true, defaultValue: 5 })
  batchSize?: number

  @Field(() => Int, { nullable: true, defaultValue: 1000 })
  delayMs?: number

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  forceRetranslate?: boolean

  @Field(() => TranslationLanguage, {
    nullable: true,
    defaultValue: TranslationLanguage.KOREAN,
  })
  targetLanguage!: TranslationLanguage
}

@ObjectType()
export class TranslatedContent {
  @Field(() => String, {
    nullable: true,
    description: 'Translated summary (title is not translated)',
  })
  summary?: string

  @Field(() => String, { nullable: true, description: 'Translated content' })
  content?: string
}

@ObjectType()
export class TranslationMetadata {
  @Field(() => String, { nullable: true })
  provider?: string

  @Field(() => String, { nullable: true })
  model?: string

  @Field(() => Float, { nullable: true })
  cost?: number

  @Field(() => Boolean, { defaultValue: false })
  cached = false
}

@ObjectType()
export class TranslationResponse {
  @Field(() => Boolean)
  success!: boolean

  @Field(() => TranslatedContent, { nullable: true })
  data?: TranslatedContent

  @Field(() => TranslationMetadata, { nullable: true })
  metadata?: TranslationMetadata

  @Field(() => String, { nullable: true })
  error?: string

  @Field(() => TranslationLanguage, {
    nullable: true,
    defaultValue: TranslationLanguage.KOREAN,
  })
  targetLanguage?: TranslationLanguage
}

@ObjectType()
export class TranslationStats {
  @Field(() => Int)
  totalTranslations!: number

  @Field(() => Int)
  pendingTranslations!: number

  @Field(() => Int)
  completedTranslations!: number

  @Field(() => Int)
  failedTranslations!: number

  @Field(() => Float)
  totalCost!: number
}

export interface TranslationResult {
  success: boolean
  translatedContent?: TranslatedContent
  provider?: string
  model?: string
  cost?: number
  error?: string
}

export interface BulkTranslationResult {
  processed: number
  successful: number
  failed: number
  errors: Array<{ wikiId: string; error: string }>
}
