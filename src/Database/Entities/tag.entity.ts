import { Entity, ManyToMany, PrimaryColumn } from 'typeorm'
import Wiki from './wiki.entity'

@Entity()
class Tag {
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @ManyToMany(() => Wiki, wiki => wiki.tags)
  wikis!: Wiki[]
}

export default Tag
