import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'
import { Content } from '../../App/content-feedback/contentFeedback.dto'
import ContentFeedbackSite from './types/IFeedback'

@ObjectType()
export class RatingsCount {
  @Field()
  contentId!: string

  @Field()
  rating!: string

  @Field()
  count!: string
}

registerEnumType(ContentFeedbackSite, {
  name: 'ContentFeedbackSite',
})

@ObjectType({ description: 'IQ feedback' })
@Entity()
class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  userId?: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  contentId?: string

  @Column('varchar', {
    length: 255,
  })
  ip!: string

  @Column('enum', { enum: ContentFeedbackSite })
  site!: ContentFeedbackSite

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  message?: string

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  reportType?: string

  @Field(() => [Content], { nullable: true })
  @Column('jsonb', { nullable: true })
  content?: Content[]

  @Field()
  @Column('integer', { nullable: true })
  rating!: number
}

export default Feedback
