// TODO: add all types
// right now only used ones are added

import { ArgsType, Field } from '@nestjs/graphql'

export interface IWiki {
  id: string
  title: string
}

@ArgsType()
export class WikiSubscriptionArgs {
  @Field(() => String)
  userId!: string

  @Field(() => String)
  subscriptionType!: string

  @Field(() => String)
  auxiliaryId!: string
}
