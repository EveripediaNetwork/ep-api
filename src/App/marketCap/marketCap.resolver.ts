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
    @Args('wikiId') wikiId: string,
    @Args('coingeckoId') coingeckoId: string,
    @Args('kind') kind: string,
  ): Promise<boolean> {
    try {
      let finalWikiId = wikiId
      if(wikiId.includes('https')){
        finalWikiId = wikiId.split('/wiki/').pop() || ''
      }
      
      if(!finalWikiId) {
        console.error('Invalid wiki ID')
        return false
      }
      const enumKind = RankType[kind as keyof typeof RankType]

      if (!enumKind) {
        console.error('Invalid kind')
        return false
      }

      await this.marketCapService.updateMistachIds({
        wikiId: finalWikiId,
        coingeckoId: coingeckoId,
        kind: enumKind,
      })

      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }
}

export default MarketCapResolver
