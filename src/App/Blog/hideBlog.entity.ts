import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm'
import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
@Entity('hidden_blogs')
class HiddenBlog {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number

  @Field()
  @Column({ unique: true })
  digest!: string

  @Field()
  @CreateDateColumn({ name: 'hidden_at' })
  hiddenAt!: Date
}

export default HiddenBlog
