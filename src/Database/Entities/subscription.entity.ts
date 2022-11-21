import { Column, Entity,  PrimaryGeneratedColumn } from 'typeorm'
import { Directive, Field, ID, ObjectType } from '@nestjs/graphql'

@ObjectType({ description: 'User subscriptions' })
@Entity()
class Subscription {
  @Field(() => ID, { nullable: true })
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field()
  sam!: number

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

  @Directive('@isUser')
  @Field({ nullable: true })
  @Column('varchar', {
    length: 255,
  })
  email!: string
}

export default Subscription
