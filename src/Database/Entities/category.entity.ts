import { Column, Entity, ManyToMany, PrimaryColumn } from 'typeorm'
import Wiki from './wiki.entity'

@Entity()
class Category {
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @Column('varchar')
  title = ''

  @Column('text')
  description = ''

  @Column('varchar')
  cardImage = '' // TODO: get defaults for hero card and icon

  @Column('varchar')
  heroImage = ''

  @Column('varchar')
  icon = ''

  @Column('smallint')
  weight = 0

  @ManyToMany(() => Wiki, wiki => wiki.categories)
  wikis!: Wiki[]
}

export default Category
