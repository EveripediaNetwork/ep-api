import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'
import {
  Directive,
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
} from '@nestjs/graphql'
import { Links, Notifications, AdvancedSettings } from './types/IUser'
import User from './user.entity'

@ObjectType()
@Entity()
class UserProfile {
  @Field(() => ID)
  @OneToOne(() => User)
  @JoinColumn()
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 25,
    nullable: true,
    unique: true 
  })
  username?: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 250,
    nullable: true,
  })
  bio?: string

  @Directive('@isUser')
  @Field({ nullable: true })
  @Column('varchar', {
    length: 100,
    nullable: true,
  })
  email?: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 46,
    nullable: true,
  })
  avatar?: string

  @Field({ nullable: true })
  @Column('varchar', {
    length: 46,
    nullable: true,
  })
  banner?: string

  @Field(() => [Links], { nullable: true })
  @Column('jsonb', { default: [] })
  links?: Links[]

  @Field(() => [Notifications])
  @Column('jsonb', { default: [new Notifications()] })
  notifications!: Notifications[]

  @Field(() => [AdvancedSettings])
  @Column('jsonb', { default: [new AdvancedSettings()] })
  advancedSettings!: AdvancedSettings[]

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn()
  created!: Date

  @Field(() => GraphQLISODateTime)
  @UpdateDateColumn()
  updated!: Date
}

export default UserProfile
