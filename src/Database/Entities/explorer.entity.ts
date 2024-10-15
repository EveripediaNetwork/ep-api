import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'
import {
  ArgsType,
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql'

@ObjectType()
export class ExplorerCount {
  @Field(() => Int, { defaultValue: 0 })
  count!: number
}

@ObjectType()
@ArgsType()
@Entity()
class Explorer {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field(() => String)
  @Column('varchar')
  explorer!: string

  @Field(() => String)
  @Column('varchar')
  baseUrl!: string

  @Field(() => Boolean)
  @Column('boolean', { default: false })
  hidden!: boolean

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

export default Explorer
