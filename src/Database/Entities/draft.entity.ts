import { ObjectType, Field, ID } from '@nestjs/graphql'
import { Entity, Column, CreateDateColumn, Index, PrimaryColumn } from 'typeorm'

@ObjectType()
@Entity()
@Index(['id'], { unique: true })
export class Draft {
  @Field(() => String)
  @PrimaryColumn({ type: 'varchar' })
  id!: string

  @Field(() => String)
  @Column({ type: 'varchar' })
  title!: string

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  wikiId?: string

  @Field(() => String)
  @Column('jsonb')
  draft!: string

  @Field(() => Date)
  @CreateDateColumn()
  createdAt!: Date
}
