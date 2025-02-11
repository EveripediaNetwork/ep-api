import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { render } from '@react-email/render'
import Email from './email/iq-wiki-newsletter'

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
    const root = process.cwd()
    const websiteUrl = this.config.get<string>('WEBSITE_URL')
    const ipfsUrl = this.config.get<string>('ipfsUrl')
    
    if (!websiteUrl || !ipfsUrl) {
      throw new Error('WEBSITE_URL or ipfsUrl is not defined in the configuration')
    }

    const htmlContent = await render(Email({
      wiki: title,
      url: `${websiteUrl}/wiki/${id}`,
      iqUrl: websiteUrl,
      wikiImage: `${ipfsUrl}${image}`,
      unsubscribeLink: `${websiteUrl}/account/settings`,
      suggestions,
    }), { pretty: true })

    await this.mailerService.sendMail({
      to: userEmail,
      from: this.config.get<string>('MAIL_SENDER'),
      subject: `IQ.wiki update - ${title}`,
      html: htmlContent,
      attachments: [
        {
          filename: 'Twitter.png',
          path: `${root}/public/Twitter.png`,
          cid: 'Twitter',
        },
        {
          filename: 'Github.png',
          path: `${root}/public/Github.png`,
          cid: 'Github',
        },
        {
          filename: 'Instagram.png',
          path: `${root}/public/Instagram.png`,
          cid: 'Instagram',
        },
        {
          filename: 'Facebook.png',
          path: `${root}/public/Facebook.png`,
          cid: 'Facebook',
        },
        {
          filename: 'Discord.png',
          path: `${root}/public/Discord.png`,
          cid: 'Discord',
        },
        {
          filename: 'Telegram.png',
          path: `${root}/public/Telegram.png`,
          cid: 'Telegram',
        },
        {
          filename: 'braindao-logo.png',
          path: `${root}/public/braindao-logo.png`,
          cid: 'logo',
        },
      ],
    })
    return true
  }}