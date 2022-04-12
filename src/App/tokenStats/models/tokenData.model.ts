import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class ROI {
  @Field()
  times?: number

  @Field()
  currency?: string

  @Field()
  percentage?: number
}

@ObjectType()
export default class TokenData {
  @Field()
  id?: string

  @Field()
  symbol?: string

  @Field({ nullable: true })
  name?: string

  @Field()
  image?: string

  @Field()
  current_price?: number

  @Field({ nullable: true })
  market_cap?: number

  @Field({ nullable: true })
  market_cap_rank?: number

  @Field({ nullable: true })
  fully_diluted_valuation?: number

  @Field({ nullable: true })
  total_volume?: number

  @Field({ nullable: true })
  high_24h?: number

  @Field({ nullable: true })
  low_24h?: number

  @Field({ nullable: true })
  price_change_24h?: number

  @Field({ nullable: true })
  price_change_percentage_24h?: number

  @Field({ nullable: true })
  market_cap_change_24h?: number

  @Field({ nullable: true })
  market_cap_change_percentage_24h?: number

  @Field({ nullable: true })
  circulating_supply?: number

  @Field({ nullable: true })
  total_supply?: number

  @Field({ nullable: true })
  max_supply?: number

  @Field({ nullable: true })
  ath?: number

  @Field({ nullable: true })
  ath_change_percentage?: number

  @Field({ nullable: true })
  ath_date?: string

  @Field({ nullable: true })
  atl?: number

  @Field({ nullable: true })
  atl_change_percentage?: number

  @Field({ nullable: true })
  atl_date?: string

  @Field({ nullable: true })
  roi?: ROI

  @Field({ nullable: true })
  last_updated?: string
}

