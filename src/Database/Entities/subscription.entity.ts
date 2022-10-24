/* eslint-disable import/no-cycle */
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

@ObjectType({ description: 'User subscriptions' })
@Entity()
class Subscription {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field()
  @Column('varchar', {
    length: 255,
  })
  userId!: string

  @Field()
  @Column('varchar', {
    length: 255,
  })
  wikiSubscriptionId!: string
}

export default Subscription
