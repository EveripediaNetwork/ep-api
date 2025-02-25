/* eslint-disable max-classes-per-file */
import {
  ObjectType,
  createUnionType,
  Field,
  registerEnumType,
  ArgsType,
} from '@nestjs/graphql'
import { Validate } from 'class-validator'
import Wiki from '../../Database/Entities/wiki.entity'
import PaginationArgs from '../pagination.args'
import { ValidStringParams } from '../utils/customValidator'
import Events from '../../Database/Entities/Event.entity'

@ObjectType()
class MarketDataGenerals {
  @Field()
  name!: string

  @Field({ nullable: true })
  alias?: string

  @Field()
  id!: string

  @Field()
  hasWiki!: boolean

  @Field()
  image!: string
}

@ObjectType()
export class NftListData extends MarketDataGenerals {
  @Field()
  floor_price_eth!: number

  @Field()
  floor_price_usd!: number

  @Field()
  market_cap_usd!: number

  @Field()
  native_currency!: string

  @Field()
  native_currency_symbol!: string

  @Field()
  h24_volume_usd!: number

  @Field()
  h24_volume_native_currency!: number

  @Field()
  floor_price_in_usd_24h_percentage_change!: number
}

@ObjectType()
export class TokenListData extends MarketDataGenerals {
  @Field()
  current_price!: number

  @Field()
  market_cap!: number

  @Field()
  market_cap_rank!: number

  @Field()
  price_change_24h!: number

  @Field()
  market_cap_change_24h!: number
}

@ObjectType()
export class TokenRankListData extends Wiki {
  @Field(() => TokenListData, { nullable: true })
  tokenMarketData?: TokenListData

  @Field(() => [Events], { nullable: true })
  events?: Events[]
}

export interface MarketCapSearchType {
  nfts: NftRankListData[]
  tokens: TokenRankListData[]
  aiTokens: TokenRankListData[]
  stableCoins: TokenRankListData[]
}

@ObjectType()
export class NftRankListData extends Wiki {
  @Field(() => NftListData, { nullable: true })
  nftMarketData?: NftListData

  @Field(() => [Events], { nullable: true })
  events?: Events[]
}

export const MarketRankData = createUnionType({
  name: 'MarketRankData',
  types: () => [NftRankListData, TokenRankListData] as const,
  resolveType(value) {
    if (value.nftMarketData) {
      return 'NftRankListData'
    }
    if (value.tokenMarketData) {
      return 'TokenRankListData'
    }

    return true
  },
})

export enum RankType {
  NFT = 'nfts',
  TOKEN = 'cryptocurrencies',
}
export enum TokenCategory {
  AI = 'artificial-intelligence',
  STABLE_COINS = 'stablecoins',
}

registerEnumType(RankType, {
  name: 'RankType',
})
registerEnumType(TokenCategory, {
  name: 'TokenCategory',
})

@ArgsType()
export class MarketCapInputs extends PaginationArgs {
  @Field(() => RankType, { defaultValue: RankType.TOKEN })
  @Validate(ValidStringParams)
  kind!: RankType

  @Field(() => TokenCategory, { nullable: true })
  @Validate(ValidStringParams)
  category?: TokenCategory

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  search?: string
}

@ArgsType()
export class MarketCapSearchInputs extends MarketCapInputs {
  @Field(() => Boolean, { nullable: true })
  founders = false
}

@ArgsType()
export class RankPageIdInputs extends PaginationArgs {
  @Field(() => String)
  wikiId!: string

  @Field(() => String)
  @Validate(ValidStringParams)
  coingeckoId!: string

  @Field(() => RankType, { defaultValue: RankType.TOKEN })
  @Validate(ValidStringParams)
  kind!: RankType
}
