import { ObjectType } from '@nestjs/graphql'
import { Entity, Column, PrimaryColumn } from 'typeorm'
import { RankType } from '../../App/marketCap/marketcap.dto'

@ObjectType()
@Entity()
class MarketCapIds {
  @PrimaryColumn({ type: 'varchar' })
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
    default: true
  })
  linked!: boolean


}
export default MarketCapIds
