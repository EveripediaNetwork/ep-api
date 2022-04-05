import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
import {
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql'
import Wiki from './wiki.entity'

export enum Status {
  CREATED,
  UPDATED,
}

registerEnumType(Status, {
  name: 'Status',
})


@ObjectType()
@Entity()
class Activity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('increment')
  id!: string

  @Field()
  @Column('varchar')
  wikiId!: string

  @Field(() => Status)
  @Column('enum', { enum: Status, nullable: true })
  type!: Status

  @Field(() => [Wiki])
  @Column('jsonb', { nullable: true })
  content!: Wiki[]

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  datetime!: Date

  @Field()
  @Column('varchar', { nullable: true })
  ipfs!: string
}

export default Activity
