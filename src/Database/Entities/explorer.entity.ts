import { Column, Entity, PrimaryColumn } from 'typeorm'
import { ArgsType, Field, ID, ObjectType } from '@nestjs/graphql'

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
  baseUrl!: string
}

export default Explorer
