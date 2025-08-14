import { Field, ObjectType, InputType, Int, Float } from '@nestjs/graphql'

@InputType()
export class TranslationInput {
  @Field(() => String)
  wikiId!: string

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  forceRetranslate?: boolean
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

  // Note: title is intentionally omitted as we don't translate titles
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
