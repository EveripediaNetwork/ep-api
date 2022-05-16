import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'

import { IWiki } from '../../types/IWiki'
import { ILanguage } from '../../types/ILanguage'

@ObjectType()
@Entity()
class Language implements ILanguage {
  @Field(() => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field(() => String)
  @Column('varchar')
  title = ''

  @OneToMany('Wiki', 'language')
  wikis!: IWiki[]
}

export default Language
