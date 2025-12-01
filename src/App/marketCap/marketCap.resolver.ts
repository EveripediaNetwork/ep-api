import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Logger, UseGuards } from '@nestjs/common'
import {
  MarketCapInputs,
  MarketCapSearchInputs,
  MarketRankData,
  NftRankListData,
  RankPageIdInputs,
  TokenRankListData,
} from './marketcap.dto'
import MarketCapService from './marketCap.service'
import AuthGuard from '../utils/admin.guard'

export function extractSlug(url: string) {
  const urlReg = url.replace(/\/$/, '')

  const parts = urlReg.split('/')

  return parts[parts.length - 1]
}

@Resolver(() => MarketRankData)
class MarketCapResolver {
  private readonly logger = new Logger(MarketCapResolver.name)

  constructor(private marketCapService: MarketCapService) {}

  @Query(() => [MarketRankData], { nullable: 'items' })
  async rankList(
    @Args() args: MarketCapInputs,
  ): Promise<(NftRankListData | TokenRankListData)[]> {
    return this.marketCapService.ranks(args)
  }

  @Query(() => [MarketRankData], { nullable: 'items' })
  async searchRank(
    @Args() args: MarketCapSearchInputs,
  ): Promise<(NftRankListData | TokenRankListData)[] | []> {
    return this.marketCapService.wildcardSearch(args)
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async linkWikiToRankData(@Args() args: RankPageIdInputs): Promise<boolean> {
    try {
      let { wikiId } = args
      if (wikiId.includes('https')) {
        wikiId = extractSlug(wikiId)
      }

      if (!wikiId) {
        this.logger.error('Invalid wiki ID')
        return false
      }

      await this.marketCapService.updateMistachIds({ ...args, wikiId })

      return true
    } catch (error) {
      this.logger.error(error)
      return false
    }
  }
}

export default MarketCapResolver
