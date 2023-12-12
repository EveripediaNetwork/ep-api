import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export default class JsonData {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({
    type: 'jsonb'
  })
  data: any
}
