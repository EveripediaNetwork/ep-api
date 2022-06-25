import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql'
import { Links, Notifications, AdvancedSettings } from './types/IUser'

@ObjectType()
@Entity()
class UserProfile {
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
    length: 100,
  })
  email!: string

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

  @Field(() => [Links])
  @Column('jsonb')
  links!: Links[]

  @Field(() => [Notifications])
  @Column('jsonb')
  nottifications!: Notifications[]

  @Field(() => [AdvancedSettings])
  @Column('jsonb')
  advancedSettings!: AdvancedSettings[]

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  created!: Date

  @Field(() => GraphQLISODateTime)
  @UpdateDateColumn()
  updated!: Date
}

export default UserProfile
