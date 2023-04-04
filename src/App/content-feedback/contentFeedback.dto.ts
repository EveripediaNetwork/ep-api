import { ArgsType, Field } from '@nestjs/graphql'

@ArgsType()
export class ContentFeedbackArgs {
  @Field(() => String, { nullable: true })
  wikiId?: string

  @Field(() => String, { nullable: true })
  userId?: string

  @Field(() => Boolean, { nullable: true })
  choice?: boolean
}

@ArgsType()
export class IQSocialFeedbackArgs {
  @Field(() => String, { nullable: true })
  reportType?: string

  @Field(() => String, { nullable: true })
  message?: string
}


export enum ContentFeedbackSite {
  IQWIKI = 'iq-wiki',
  IQSOCIAL = 'iq-social',
  IQSEARCH = 'iq-search',
}

export enum ContentFeedbackType {
    POSITIVE = 'positive',
    NEGATIVE = 'negative',
    NEUTRAl = 'neutral',
}

export interface ContentFeedbackPayload {
  id?: string
  site?: ContentFeedbackSite
  feedback?: ContentFeedbackType
  message?: string
  content?: Record<string, unknown>
}