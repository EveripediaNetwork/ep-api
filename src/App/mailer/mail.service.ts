import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { render } from '@react-email/render'
import Email from '../../../emails'

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
    const websiteUrl = this.config.get<string>('WEBSITE_URL')
    const ipfsUrl = this.config.get<string>('ipfsUrl')

    if (!websiteUrl || !ipfsUrl) {
      throw new Error(
        'WEBSITE_URL or ipfsUrl is not defined in the configuration',
      )
    }

    const modifiedSuggestion = suggestions.map(({ images, ...suggestion }) => ({
      ...suggestion,
      image: images.map(
        (img: { id: string; type: string }) => `${ipfsUrl}${img.id}`,
      )[0],
    }))

    const htmlContent = await render(
      Email({
        wiki: title,
        url: `${websiteUrl}/wiki/${id}`,
        iqUrl: websiteUrl,
        wikiImage: `${ipfsUrl}${image}`,
        unsubscribeLink: `${websiteUrl}/account/settings`,
        suggestions: modifiedSuggestion,
      }),
      { pretty: false },
    )

    await this.mailerService.sendMail({
      to: userEmail,
      from: this.config.get<string>('MAIL_SENDER'),
      subject: `IQ.wiki update - ${title}`,
      html: htmlContent,
    })
    return true
  }
}
