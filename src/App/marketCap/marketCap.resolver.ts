import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import {
  MarketCapInputs,
  MarketRankData,
  NftRankListData,
  RankPageIdInputs,
  TokenRankListData,
} from './marketcap.dto'
import MarketCapService from './marketCap.service'

function extractSlug(url: string) {
  // Remove trailing slash if it exists
  const urlReg = url.replace(/\/$/, '')

  // Split the URL by '/'
  const parts = urlReg.split('/')

  // Return the last part
  return parts[parts.length - 1]
}

@Resolver(() => MarketRankData)
class MarketCapResolver {
  constructor(private marketCapService: MarketCapService) {}

  @Query(() => [MarketRankData], { nullable: 'items' })
  async rankList(
    @Args() args: MarketCapInputs,
  ): Promise<NftRankListData | TokenRankListData> {
    return this.marketCapService.ranks(args)
  }

  @Mutation(() => Boolean)
  async rankPageIds(@Args() args: RankPageIdInputs): Promise<boolean> {
    return this.marketCapService.updateMistachIds(args)
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

      await this.marketCapService.updateMistachIds({
        wikiId,
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
