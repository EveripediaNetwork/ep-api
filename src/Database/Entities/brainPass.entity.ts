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
  @Column('integer')
  tokenId!: number

  @Field(() => ID)
  @Column('integer')
  passId!: number

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  owner!: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  description!: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  metadataHash?: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  transactionHash!: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  transactionType?: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
  })
  image!: string

  @Field(() => String, { nullable: true })
  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  passName!: string

  @Field(() => Int, { nullable: true })
  @Column('varchar')
  price!: string

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
