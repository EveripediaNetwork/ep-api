import { Column, Entity, PrimaryColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

interface Links {
    instagram?: string
    twitter?: string
    website?: string
}


@ObjectType()
@Entity()
class Userprofile {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field()
  @Column('varchar', {
    length: 25,
  })
  username!: string

  @Field()
  bio!: string

  @Field()
  @Column('varchar', {
    length: 100
  })
  email!: string

  @Field()
  @Column('jsonb')
  links!: Links

  @Field()
  @Column('varchar', {
    length: 46,
  })
  avatar!: string

  @Field()
  @Column('varchar', {
    length: 46,
  })
  banner!: string
}

export default Userprofile
