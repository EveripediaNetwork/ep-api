import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Wiki as WikiType } from "@everipedia/iq-utils";

@Injectable()
class IPFSGetterService {
	constructor(
		private httpService: HttpService,
		private configService: ConfigService,
	) {}

	async getIPFSDataFromHash(hash: string): Promise<WikiType> {
		let response;
		try {
			response = await this.httpService
				.get(this.configService.get("ipfsUrl") + hash)
				.toPromise();
		} catch (err) {
			console.error("IpfsHash ERROR", JSON.stringify(err, null, 2));
		}
		return response?.data;
	}
}

export default IPFSGetterService;
