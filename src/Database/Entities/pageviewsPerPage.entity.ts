import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql'

@ObjectType({ description: 'User subscriptions' })
@Entity()
class PageviewsPerDay {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field()
  @Column('varchar', {
    length: 255,
  })
  wikiId!: string

  @Field(() => GraphQLISODateTime)
  @Column(() => Date)
  day!: Date

  @Field()
  @Column('integer')
  visits!: number
}

export default PageviewsPerDay
