import { Column, Model, Table } from 'sequelize-typescript'

type HashAttributes = {
  userId: string
  version: number
  edited: boolean
}

@Table
export default class Hash extends Model<HashAttributes> {
  @Column({ defaultValue: 0 })
  version?: number

  //   @Column
  //   ipfsHash!: string

  @Column
  userId!: string

  @Column({ defaultValue: false })
  edited?: boolean
}
