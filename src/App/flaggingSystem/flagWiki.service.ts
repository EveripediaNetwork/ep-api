import { Injectable } from "@nestjs/common";
import { ActionTypes, FlagWikiWebhook } from "../utils/utilTypes";
import WebhookHandler from "../utils/discordWebhookHandler";

@Injectable()
class FlagWikiService {
	constructor(private webhookHandler: WebhookHandler) {}

	async flagWiki(data: FlagWikiWebhook) {
		await this.webhookHandler.postWebhook(ActionTypes.FLAG_WIKI, data);
		return true;
	}
}

export default FlagWikiService;
