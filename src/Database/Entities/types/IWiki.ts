// TODO: add all types
// right now only used ones are added

import { ArgsType, Field } from '@nestjs/graphql'
import LinkedWikis from './ILinkedWikis'
import Events from '../Event.entity'

export interface IWiki {
  id: string
  title: string
  linkedWikis: LinkedWikis
  events: Events
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
