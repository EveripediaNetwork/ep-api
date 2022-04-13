import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class Currency {
  @Field()
  usd?: number
}

@ObjectType()
export class MarketData {
  @Field()
  market_cap?: Currency

  @Field()
  market_cap_change_percentage_24h?: number

  @Field()
  total_volume?: Currency

  @Field()
  price_change_percentage_24h?: number

  @Field()
  fully_diluted_valuation?: Currency
}

@ObjectType()
export default class TokenData {
  @Field()
  id?: string

  @Field()
  symbol?: string

  @Field()
  name?: string

  @Field()
  market_data?: MarketData
}
