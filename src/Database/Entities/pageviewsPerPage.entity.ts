import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql'

@ObjectType({ description: 'User subscriptions' })
@Entity()
class PageviewsPerDay {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field(() => GraphQLISODateTime)
  @Column(() => Date)
  updated!: Date

  @Field()
  @Column('varchar', {
    length: 255,
  })
  wikiId!: string

  @Field()
  @Column('integer')
  visits!: number
}

export default PageviewsPerDay
