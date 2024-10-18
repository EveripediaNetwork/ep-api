import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql'
import {
  MarketCapInputs,
  MarketRankData,
  NftRankListData,
  RankPageIdInputs,
  TokenRankListData,
} from './marketcap.dto'
import MarketCapService from './marketCap.service'
import MarketCapSearch from './marketCapSearch.service'

function extractSlug(url: string) {
  const urlReg = url.replace(/\/$/, '')

  const parts = urlReg.split('/')

  return parts[parts.length - 1]
}

@Resolver(() => MarketRankData)
class MarketCapResolver {
  constructor(
    private marketCapService: MarketCapService,
    private marketCapSearch: MarketCapSearch,
  ) {}

  @Query(() => [MarketRankData], { nullable: 'items' })
  async rankList(
    @Args() args: MarketCapInputs,
  ): Promise<(NftRankListData | TokenRankListData)[]> {
    return this.marketCapService.ranks(args)
  }

  @Query(() => [MarketRankData], { nullable: 'items' })
  async searchRank(
    @Args() args: MarketCapInputs,
  ): Promise<(NftRankListData | TokenRankListData)[] | []> {
    return this.marketCapService.wildcardSearch(args)
  }

  @Mutation(() => Boolean)
  async linkWikiToRankData(@Args() args: RankPageIdInputs): Promise<boolean> {
    try {
      let { wikiId } = args
      if (wikiId.includes('https')) {
        wikiId = extractSlug(wikiId)
      }

      if (!wikiId) {
        console.error('Invalid wiki ID')
        return false
      }

      await this.marketCapService.updateMistachIds({ ...args, wikiId })

      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }

  @Subscription(() => Boolean)
  marketCapSearchSubscription() {
    return this.marketCapSearch
      .getRankPagePubSub()
      .asyncIterator('marketCapSearchSubscription')
  }
}

export default MarketCapResolver
