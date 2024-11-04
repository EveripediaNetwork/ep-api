import { ObjectType } from '@nestjs/graphql'
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'
import { RankType } from '../../App/marketCap/marketcap.dto'

@ObjectType()
@Entity()
class MarketCapIds {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('varchar')
  wikiId!: string

  @Column({ type: 'varchar' })
  coingeckoId!: string

  @Column({
    type: 'enum',
    enum: RankType,
  })
  kind!: RankType

  @Column({
    type: 'boolean',
    default: true,
  })
  linked!: boolean
}
export default MarketCapIds
