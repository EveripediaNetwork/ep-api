import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql'
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm'
import tokenDecimalMiddleware from './middlewares/tokenDecimalMiddleware'

@ObjectType()
@Entity()
class HiIQHolderAddress {
  @Column('integer', {
    generated: 'increment',
    nullable: false,
  })
  id!: number

  @Field(() => String)
  @PrimaryColumn('varchar')
  address!: string

  @Field(() => String, { middleware: [tokenDecimalMiddleware] })
  @Column('numeric')
  tokens!: string

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  created!: Date

  @Field(() => GraphQLISODateTime)
  @UpdateDateColumn()
  updated!: Date

  @Field(() => Int)
  @Column('integer')
  block!: number
}

export default HiIQHolderAddress
