import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm'
import Wiki from './wiki.entity'

@Entity()
class Language {
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Column('varchar')
  title = ''

  @OneToMany(() => Wiki, wiki => wiki.language)
  wikis!: Wiki[]
}

export default Language
