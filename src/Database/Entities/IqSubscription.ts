import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

@ObjectType({ description: 'User subscriptions' })
@Entity()
class IqSubscription {
  @Field(() => ID, { nullable: true })
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 255,
  })
  userId!: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 255,
  })
  subscriptionType!: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 255,
  })
  auxiliaryId!: string
}

export default IqSubscription
