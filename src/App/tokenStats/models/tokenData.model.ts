import { ObjectType, Field, ArgsType } from '@nestjs/graphql'
import { Validate } from 'class-validator'
import { ValidStringParams } from '../../utils/customValidator'

@ObjectType()
export default class TokenData {
  @Field({ defaultValue: 'not_found' })
  id!: string

  @Field({ defaultValue: 'not_found' })
  symbol!: string

  @Field({ defaultValue: 'not_found' })
  name!: string

  @Field({ defaultValue: 'not_found' })
  token_image_url!: string

  @Field({ defaultValue: 0 })
  token_price_in_usd!: number

  @Field({ defaultValue: 0 })
  market_cap!: number

  @Field({ defaultValue: 0 })
  market_cap_percentage_change!: number

  @Field({ defaultValue: 0 })
  price_percentage_change!: number

  @Field({ defaultValue: 0 })
  diluted_market_cap!: number

  @Field({ defaultValue: 0 })
  diluted_market_cap_percentage_change!: number

  @Field({ defaultValue: 0 })
  volume!: number

  @Field({ defaultValue: 0 })
  volume_percentage_change!: number
}

@ArgsType()
export class TokenStatArgs {
  @Field(() => String, { nullable: true, name: 'tokenName' })
  @Validate(ValidStringParams)
  tokenName!: string
}
