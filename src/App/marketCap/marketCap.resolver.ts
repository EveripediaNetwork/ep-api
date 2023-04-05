import { Args, Query, Resolver } from "@nestjs/graphql";
import {
	MarketCapInputs,
	MarketRankData,
	NftRankListData,
	TokenRankListData,
} from "./marketcap.dto";
import MarketCapService from "./marketCap.service";

@Resolver(() => MarketRankData)
class MarketCapResolver {
	constructor(private marketCapService: MarketCapService) {}

	@Query(() => [MarketRankData], { nullable: 'items' })
	async rankList(
		@Args() args: MarketCapInputs,
	): Promise<NftRankListData | TokenRankListData> {
		return this.marketCapService.ranks(args);
	}
}

export default MarketCapResolver;
