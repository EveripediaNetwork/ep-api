import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export default class TokenData {
  @Field()
  id?: string

  @Field()
  symbol?: string

  @Field()
  name?: string

  @Field()
  market_cap?: number

  @Field()
  market_cap_percentage_change?: number

  @Field()
  diluted_market_cap?: number

  @Field()
  diluted_market_cap_percentage_change?: number

  @Field()
  volume?: number

  @Field()
  volume_percentage_change?: number
}
