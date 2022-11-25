import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

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
    summary: string,
  ): Promise<boolean> {
    await this.mailerService.sendMail({
      to: userEmail,
      from: this.config.get<string>('MAIL_SENDER'),
      subject: `IQ.wiki update - ${title}`,
      template: './iqMail',
      context: {
        wiki: title,
        url: `${this.config.get<string>('WEBSITE_URL')}/wiki/${id}`,
        iqUrl: this.config.get<string>('WEBSITE_URL'),
        wikiImage: `${this.config.get<string>('ipfsUrl')}${image}`,
        unsubscribeLink: `${this.config.get<string>(
          'WEBSITE_URL',
        )}/account/settings`,
        summary,
      },
    })
    return true
  }
}
