import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql'
import { ContentFeedbackSite, ContentFeedbackType } from './types/IFeedback'
import { Content } from '../../App/content-feedback/contentFeedback.dto'

registerEnumType(ContentFeedbackSite, {
  name: 'ContentFeedbackSite',
})
registerEnumType(ContentFeedbackType, {
  name: 'ContentFeedbackType',
})

@ObjectType({ description: 'IQ feedback' })
@Entity()
class Feedback {
  @Field(() => ID)
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

  @Field()
  @Column('varchar', {
    length: 255,
  })
  ip!: string

  @Field(() => ContentFeedbackSite)
  @Column('enum', { enum: ContentFeedbackSite })
  site!: ContentFeedbackSite

  @Field(() => ContentFeedbackType)
  @Column('enum', { enum: ContentFeedbackType })
  feedback!: ContentFeedbackType

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  message?: string

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  reportType?: string

  @Field(() => [Content], { nullable: true })
  @Column('jsonb', { nullable: true })
  content?: Content[]
}

export default Feedback
