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
  ): Promise<boolean> {
    // TODO: Email formatting
    await this.mailerService.sendMail({
      to: userEmail,
      from: this.config.get<string>('MAIL_SENDER'),
      subject: 'IQ.wiki update',
      template: './iqMail',
      context: {
        wiki: title,
        url: `http://dev.iq.wiki/wiki/${id}`,
        iqUrl: 'http://dev.iq.wiki/',
      },
    })
    return true
  }
}
