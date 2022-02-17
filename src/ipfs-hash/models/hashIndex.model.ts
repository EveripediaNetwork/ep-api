import { Column, Model, Table } from 'sequelize-typescript'

@Table
export default class HashIndex extends Model<HashIndex> {
  @Column({ defaultValue: 0 })
  version?: number

  @Column
  ipfsHash!: string

  @Column
  userId!: string

  @Column({ defaultValue: false })
  edited?: boolean
}
