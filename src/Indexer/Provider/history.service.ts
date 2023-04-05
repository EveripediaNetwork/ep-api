import { Injectable } from "@nestjs/common";

@Injectable()
class HistoryProviderService {
	getIPFSHashesFromBlock(/* block: number */): [string] {
		// TODO: get array of ipfs hashesh from a block. TODO: create interface
		return [""];
	}
}

export default HistoryProviderService;
