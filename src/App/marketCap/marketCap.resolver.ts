import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import {
  MarketCapInputs,
  MarketRankData,
  NftRankListData,
  RankPageIdInputs,
  RankType,
  TokenRankListData,
} from './marketcap.dto'
import MarketCapService from './marketCap.service'
// import { WikiUrl } from '../Wiki/wiki.dto'

@Resolver(() => MarketRankData)
class MarketCapResolver {
  constructor(private marketCapService: MarketCapService) {}

  @Query(() => [MarketRankData], { nullable: 'items' })
  async rankList(
    @Args() args: MarketCapInputs,
  ): Promise<NftRankListData | TokenRankListData> {
    return this.marketCapService.ranks(args)
  }

  @Mutation(() => Boolean )
  async rankPageIds(
    @Args() args: RankPageIdInputs,
  ): Promise<boolean> {
    return this.marketCapService.updateMistachIds(args)
  }

  @Mutation(() => Boolean)
  async linkWikiToRankData(
    @Args() args: RankPageIdInputs,
  ): Promise<boolean> {
    try {
      let wikiId = args.wikiId
      if (wikiId.includes('https')) {
        wikiId = wikiId.split('/wiki/').pop() || ''
      }

      if (!wikiId) {
        console.error('Invalid wiki ID')
        return false
      }

      await this.marketCapService.updateMistachIds({
        wikiId: wikiId,
        coingeckoId: args.coingeckoId,
        kind: args.kind,
      })

      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }
}

export default MarketCapResolver
