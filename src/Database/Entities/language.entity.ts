import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm'
import { Field, ID, ObjectType } from '@nestjs/graphql'
import Wiki from './wiki.entity'

@ObjectType()
@Entity()
class Language {
  @Field(type => ID)
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Field(type => String)
  @Column('varchar')
  title = ''

  @OneToMany(() => Wiki, wiki => wiki.language)
  wikis!: Wiki[]
}

export default Language
