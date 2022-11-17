import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('varchar')
  wikiId!: string

  @Column()
  title!: string

  @Column()
  pending!: boolean
}

export default Notification
