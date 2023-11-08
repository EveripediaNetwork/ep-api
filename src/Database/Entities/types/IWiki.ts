// TODO: add all types
// right now only used ones are added

import { ArgsType, Field } from '@nestjs/graphql'
import LinkedWikis from './ILinkedWikis'

export interface IWiki {
  id: string
  title: string
  linkedWikis: LinkedWikis
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
