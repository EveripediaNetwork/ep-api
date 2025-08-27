import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql'
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@ObjectType()
@Entity()
class Treasury {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number

  @Field(() => String)
  @Column('varchar', { nullable: false })
  totalValue!: string

  @Field(() => GraphQLISODateTime)
  @Column('timestamp', { unique: true })
  created!: Date

  @Field(() => GraphQLISODateTime)
  @UpdateDateColumn()
  updated!: Date
}

export default Treasury
