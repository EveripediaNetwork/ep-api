import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
@Entity()
class BrainPass {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number

  @Field(() => ID)
  @Column('integer', { unique: true })
  nftId!: number

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  address!: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  description!: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  transactionHash!: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  image!: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  name!: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  externalUrl!: string

  @Field(() => Int, { nullable: true })
  @Column('integer')
  amount!: number

  @Field(() => GraphQLISODateTime, {
    nullable: true,
  })
  @CreateDateColumn()
  created!: Date

  @Field(() => GraphQLISODateTime, {
    nullable: true,
  })
  @UpdateDateColumn()
  updated!: Date
}

export default BrainPass
