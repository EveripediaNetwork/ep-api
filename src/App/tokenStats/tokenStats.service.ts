import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import TokenData from "./models/tokenData.model";
import StatsGetterService from "./stats-getter.service";

@Injectable()
class TokenStatsService {
	constructor(
		private statsGetterService: StatsGetterService,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
	) {}

	async getStats(name: string, cmcName?: string): Promise<TokenData> {
		const cached: TokenData | undefined = await this.cacheManager.get(
			name.toLowerCase(),
		);
		if (cached) {
			return cached;
		}
		const result = await this.statsGetterService.getStats(name, cmcName);
		const { id } = result.id;
		await this.cacheManager.set(id, result);
		return result;
	}
}
export default TokenStatsService;
