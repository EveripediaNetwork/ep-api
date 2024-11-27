import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql'
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import tokenDecimalMiddleware from './middlewares/tokenDecimalMiddleware'

@ObjectType()
@Entity()
class HiIQHolderAddress {
  @PrimaryGeneratedColumn()
  id!: number

  @Field(() => String)
  @Column('varchar', {
    unique: true,
  })
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
}

export default HiIQHolderAddress
