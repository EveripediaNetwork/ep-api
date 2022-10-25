import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

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

  @Field({ nullable: true })
  @Column('varchar', {
    length: 255,
  })
  notificationType!: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 255,
  })
  auxiliaryId!: string
}

export default Subscription
