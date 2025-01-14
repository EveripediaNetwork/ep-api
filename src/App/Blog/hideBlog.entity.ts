import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm'

@Entity('hidden_blogs')
class HiddenBlog {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ unique: true })
  digest!: string

  @CreateDateColumn({ name: 'hidden_at' })
  hiddenAt!: Date
}

export default HiddenBlog
