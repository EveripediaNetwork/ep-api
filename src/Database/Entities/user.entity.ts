import { Entity, OneToMany, PrimaryColumn } from 'typeorm'
import Wiki from './wiki.entity'

@Entity()
class User {
  @PrimaryColumn('varchar', {
    length: 255,
  })
  id!: string

  @OneToMany(() => Wiki, wiki => wiki.user)
  wikis!: Wiki[]
}

export default User
