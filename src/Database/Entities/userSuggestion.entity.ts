import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Field, ID, Int, ObjectType } from '@nestjs/graphql'
import { IsEmail } from 'class-validator'

@ObjectType()
@Entity()
export default class UserSuggestion {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field()
  @Column({ type: 'text' })
  name!: string

  @Field(() => String)
  @Column({ type: 'json' })
  suggestion!: string

  @Field(() => String)
  @Column({ type: 'text', nullable: true })
  wikiId?: string

  @Field(() => String)
  @Column({ type: 'text', nullable: true })
  wikiTitle?: string

  @Field({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  email?: string

  @Field()
  @Column({ type: 'integer' })
  relevance!: number

  @Field(() => Int)
  @Column({ type: 'integer' })
  cryptoScore!: number

  @Field()
  @CreateDateColumn()
  createdAt!: Date

  @Field()
  @UpdateDateColumn()
  updatedAt!: Date
}
