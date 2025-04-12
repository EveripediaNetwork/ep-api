import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql'
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm'

@ObjectType()
@Entity()
class HiIQHolder {
  @Field(() => ID)
  @Column('integer', {
    generated: 'increment',
    nullable: false,
  })
  id!: number

  @Field(() => Int)
  @Column('integer')
  amount!: number

  @Field(() => GraphQLISODateTime)
  @PrimaryColumn('date')
  day!: Date

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  created!: Date

  @Field(() => GraphQLISODateTime)
  @UpdateDateColumn()
  updated!: Date
}

export default HiIQHolder
