/* eslint-disable max-classes-per-file */
import {
  ObjectType,
  createUnionType,
  Field,
  registerEnumType,
  ArgsType,
  PickType,
  CustomScalar,
  Scalar,
} from '@nestjs/graphql'
import { Validate } from 'class-validator'
import Wiki from '../../Database/Entities/wiki.entity'
import PaginationArgs from '../pagination.args'
import { ValidStringParams } from '../utils/customValidator'
import { ValueNode, Kind } from 'graphql'

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

export interface MarketCapSearchType {
  nfts: NftRankListData[]
  tokens: TokenRankListData[]
  aiTokens: TokenRankListData[]
  memeTokens: TokenRankListData[]
  stableCoins: TokenRankListData[]
  [key: string]: TokenRankListData[]
}

@ObjectType()
export class RankListData extends PickType(Wiki, [
  'id',
  'title',
  'images',
  'founderWikis',
  'events',
  'blockchainWikis',
  'tags',
] as const) {}

@ObjectType()
export class TokenRankListData extends RankListData {
  @Field(() => TokenListData, { nullable: true })
  tokenMarketData?: TokenListData
}

@ObjectType()
export class NftRankListData extends RankListData {
  @Field(() => NftListData, { nullable: true })
  nftMarketData?: NftListData
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

registerEnumType(RankType, {
  name: 'RankType',
})

@ArgsType()
export class MarketCapInputs extends PaginationArgs {
  @Field(() => RankType, { defaultValue: RankType.TOKEN })
  @Validate(ValidStringParams)
  kind!: RankType

  @Field(() => String, { nullable: true })
  category?: string

  @Field(() => String, { nullable: true })
  @Validate(ValidStringParams)
  search?: string

  @Field(() => Boolean, { defaultValue: true })
  hasWiki?: boolean
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

  @Field(() => Boolean, { defaultValue: true })
  hasWiki!: boolean
}

export const STABLECOIN_CATEGORIES_CACHE_KEY = 'stablecoinCategories'
export const NO_WIKI_MARKETCAP_SEARCH_CACHE_KEY = 'noWikiMarketcapSearch'
export const MARKETCAP_SEARCH_CACHE_KEY = 'marketcapSearch'
export const BASE_URL_COINGECKO_API = 'https://pro-api.coingecko.com/api/v3/'
