import { Column, Entity, PrimaryColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

interface Links {
  instagram?: string
  twitter?: string
  website?: string
}

interface Notifications {
    EVERIPEDIA_NOTIFICATIONS: boolean
    WIKI_OF_THE_DAY: boolean
    WIKI_OF_THE_MONTH: boolean
    EDIT_NOTIFICATIONS: boolean
}

interface AdvancedSettings {
    SIGN_EDITS_WITH_RELAYER: boolean
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
    length: 100,
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

  @Field()
  @Column('jsonb')
  nottifications!: Notifications

  @Field()
  @Column('jsonb')
  advancedSettings!: AdvancedSettings
}

export default Userprofile
