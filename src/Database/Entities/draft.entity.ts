import { ObjectType, Field, ID } from '@nestjs/graphql'
import {
  Entity,
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  PrimaryColumn,
} from 'typeorm'

@ObjectType()
@Entity()
@Index(['id', 'title'], { unique: true })
export class Draft {
  @Field(() => String)
  @PrimaryColumn()
  id!: string

  @Field(() => String)
  @PrimaryColumn()
  title!: string

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  wikiId?: string

  @Field(() => String)
  @Column('jsonb')
  draft!: any

  @Field(() => Date)
  @CreateDateColumn()
  createdAt!: Date
}
