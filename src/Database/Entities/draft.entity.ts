import { ObjectType, Field, ID } from '@nestjs/graphql'
import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm'

@ObjectType()
@Entity()
export class Draft {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Field(() => String)
  @Column({ type: 'varchar' })
  userId!: string

  @Field(() => String)
  @Column({ type: 'varchar' })
  title!: string

  @Field(() => String)
  @Column({ type: 'varchar' })
  wikiId!: string

  @Field(() => String)
  @Column('jsonb')
  draft!: string

  @Field(() => Date)
  @CreateDateColumn()
  createdAt!: Date
}
