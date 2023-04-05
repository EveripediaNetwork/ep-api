import { ArgsType, Field, ObjectType } from '@nestjs/graphql'
import { ContentFeedbackSite, ContentFeedbackType } from '../../Database/Entities/types/IFeedback'

@ObjectType()
export class Content {
  @Field()
  input!: string

  @Field()
  output!: string
}

@ArgsType()
export class ContentFeedbackArgs {
  @Field(() => String, {
    nullable: true,
    description: 'The slug id of content page',
  })
  id?: string

  @Field(() => String, { nullable: true })
  userId?: string

  @Field(() => String, {
    nullable: true,
    description: 'IQ platorm, e.g iq-wiki, iq-social',
  })
  site?: ContentFeedbackSite

  @Field(() => String, { nullable: true })
  message?: string

  @Field(() => [Content], { nullable: true })
  content?: Content

  @Field(() => String, { nullable: true })
  contentId?: string

  @Field(() => String, { nullable: true })
  feedback?: ContentFeedbackType
 
  @Field(() => String, { nullable: true })
  reportType?: string
}

export class ContentFeedbackPayload extends ContentFeedbackArgs {
  ip!: string
}
