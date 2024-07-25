import { ObjectType, Field, ArgsType } from '@nestjs/graphql'
import { Validate } from 'class-validator'
import ValidStringParams from '../../utils/customValidator'

@ObjectType()
export default class TokenData {
  @Field()
  id!: string

  @Field()
  symbol!: string

  @Field()
  name!: string

  @Field()
  token_image_url!: string

  @Field()
  token_price_in_usd!: number

  @Field()
  market_cap!: number

  @Field()
  market_cap_percentage_change!: number

  @Field()
  price_percentage_change!: number

  @Field()
  diluted_market_cap!: number

  @Field()
  diluted_market_cap_percentage_change!: number

  @Field()
  volume!: number

  @Field()
  volume_percentage_change!: number
}

@ArgsType()
export class TokenStatArgs {
  @Field(() => String, { nullable: true, name: 'tokenName' })
  @Validate(ValidStringParams)
  tokenName!: string

  @Field(() => String, { nullable: true, name: 'cmcTokenName' })
  @Validate(ValidStringParams)
  cmcTokenName?: string
}
