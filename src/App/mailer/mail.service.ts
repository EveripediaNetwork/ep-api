import { MailerService } from '@nestjs-modules/mailer'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { render } from '@react-email/render'
import * as React from 'react'
import Email from '../../../emails'

if (typeof global !== 'undefined') {
  global.React = React
}

@Injectable()
export default class MailService {
  private readonly logger = new Logger(MailService.name)

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
    try {
      if (!userEmail?.trim()) {
        this.logger.warn('No email provided for sendIqUpdate')
        return false
      }

      if (!id?.trim() || !title?.trim()) {
        this.logger.warn(
          'Missing required parameters (id or title) for sendIqUpdate',
        )
        return false
      }

      const websiteUrl = this.config.get<string>('WEBSITE_URL')
      const ipfsUrl = this.config.get<string>('ipfsUrl')
      const mailSender = this.config.get<string>('MAIL_SENDER')

      if (!websiteUrl || !ipfsUrl || !mailSender) {
        this.logger.error(
          'Missing required configuration: WEBSITE_URL, ipfsUrl, or MAIL_SENDER',
        )
        return false
      }

      const modifiedSuggestion = Array.isArray(suggestions)
        ? suggestions
            .filter(
              (suggestion) =>
                suggestion?.images && Array.isArray(suggestion.images),
            )
            .map(({ images, ...suggestion }) => ({
              ...suggestion,
              image:
                images
                  .filter((img: any) => img?.id)
                  .map(
                    (img: { id: string; type: string }) =>
                      `${ipfsUrl}${img.id}`,
                  )[0] || '',
            }))
        : []

      const htmlContent = await render(
        Email({
          wiki: title,
          url: `${websiteUrl}/wiki/${id}`,
          iqUrl: websiteUrl,
          wikiImage: image ? `${ipfsUrl}${image}` : '',
          unsubscribeLink: `${websiteUrl}/account/settings`,
          suggestions: modifiedSuggestion,
        }),
        { pretty: false },
      )

      await this.mailerService.sendMail({
        to: userEmail.trim(),
        from: mailSender,
        subject: `IQ.wiki update - ${title}`,
        html: htmlContent,
      })

      this.logger.log(
        `Email sent successfully to ${userEmail} for wiki: ${title}`,
      )
      return true
    } catch (error) {
      this.logger.error(`Failed to send email to ${userEmail}:`, error)
      return false
    }
  }
}
