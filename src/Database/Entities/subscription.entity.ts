/* eslint-disable import/no-cycle */
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class SubscriptionContent {
  @Field(() => String)
  id!: string

  @Field(() => String)
  type!: string
}

@ObjectType({ description: 'User subscriptions' })
@Entity()
class Subscription {
  @Field(() => ID, { nullable: true })
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 255,
  })
  userId!: string

  @Field(() => [SubscriptionContent], { nullable: true })
  @Column('jsonb', { default: null })
  subscription!: SubscriptionContent[]
}

export default Subscription
