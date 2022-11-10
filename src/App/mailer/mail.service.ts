import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'

@Injectable()
export default class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUiqUpdate(userEmail: string) {
    await this.mailerService.sendMail({
      to: userEmail,
      from: '"Support Team" <support@example.com>',
      subject: 'IQ.wiki update',
      template: './iqMail',
    })
  }
}
