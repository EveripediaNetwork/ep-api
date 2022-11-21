import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('varchar')
  auxId!: string

  @Column()
  title!: string

  @Column('varchar', { default: 'UPDATED' })
  notificationType!: string

  @Column()
  pending!: boolean
}

export default Notification
