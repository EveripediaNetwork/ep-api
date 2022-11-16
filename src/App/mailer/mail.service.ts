import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export default class MailService {
  constructor(
    private mailerService: MailerService,
    private config: ConfigService,
  ) {}

  async sendIqUpdate(userEmail: string): Promise<boolean> {
    // TODO: Email formatting
    await this.mailerService.sendMail({
      to: userEmail,
      from: this.config.get<string>('MAIL_SENDER'),
      subject: 'IQ.wiki update',
      template: './iqMail',
      context: {
        wiki: 'right-of-way',
        url: 'http://dev.iq.wiki/wiki/right-of-way',
        iqUrl: 'http://dev.iq.wiki/',
      },
    })
    return true
  }
}
