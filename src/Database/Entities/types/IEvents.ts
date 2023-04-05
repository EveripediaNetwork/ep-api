import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'
import { EventType } from '@everipedia/iq-utils'

registerEnumType(EventType, { name: 'EventType' })

export interface IEvents {
  date: string
  title?: string
  type: EventType
  description?: string
  link?: string
}

@ObjectType()
class Events {
  @Field({ nullable: true })
  title?: string

  @Field(() => EventType, { nullable: true })
  type?: EventType

  @Field(() => String, { nullable: true })
  date?: string

  @Field(() => String, { nullable: true })
  description?: string

  @Field(() => String, { nullable: true })
  link?: string
}

export default Events
