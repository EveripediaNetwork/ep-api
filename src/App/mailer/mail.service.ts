import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export default class MailService {
	constructor(
		private mailerService: MailerService,
		private config: ConfigService,
	) {}

	async sendIqUpdate(
		userEmail: string,
		id: string,
		title: string,
		image: string,
		suggestions: any[],
	): Promise<boolean> {
		const root = process.cwd();
		await this.mailerService.sendMail({
			to: userEmail,
			from: this.config.get<string>("MAIL_SENDER"),
			subject: `IQ.wiki update - ${title}`,
			template: "./iqMail",
			context: {
				wiki: title,
				url: `${this.config.get<string>("WEBSITE_URL")}/wiki/${id}`,
				iqUrl: this.config.get<string>("WEBSITE_URL"),
				wikiImage: `${this.config.get<string>("ipfsUrl")}${image}`,
				unsubscribeLink: `${this.config.get<string>(
					"WEBSITE_URL",
				)}/account/settings`,
				suggestions,
			},
			attachments: [
				{
					filename: "Twiiter.png",
					path: `${root}/public/Twitter.png`,
					cid: "Twitter",
				},
				{
					filename: "Github.png",
					path: `${root}/public/Github.png`,
					cid: "Github",
				},
				{
					filename: "Instagram.png",
					path: `${root}/public/Instagram.png`,
					cid: "Instagram",
				},
				{
					filename: "Facebook.png",
					path: `${root}/public/Facebook.png`,
					cid: "Facebook",
				},
				{
					filename: "discord.png",
					path: `${root}/public/Discord.png`,
					cid: "Discord",
				},
				{
					filename: "Telegram.png",
					path: `${root}/public/Telegram.png`,
					cid: "Telegram",
				},
				{
					filename: "braindao-logo.png",
					path: `${root}/public/braindao-logo.png`,
					cid: "logo",
				},
			],
		});
		return true;
	}
}
