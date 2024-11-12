import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql'
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

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

  @Field(() => String)
  @Column({ type: 'numeric', precision: 78, scale: 0 })
  tokens!: string

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  created!: Date

  @Field(() => GraphQLISODateTime)
  @UpdateDateColumn()
  updated!: Date
}

export default HiIQHolderAddress
