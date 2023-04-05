import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { DataSource } from 'typeorm'
import { ActionTypes, WebhookPayload } from '../utils/utilTypes'
import WebhookHandler from '../utils/discordWebhookHandler'
import { ContentFeedbackPayload } from './contentFeedback.dto'
import Feedback from '../../Database/Entities/feedback.entity'
import {
  ContentFeedbackSite,
  ContentFeedbackType,
} from '../../Database/Entities/types/IFeedback'

@Injectable()
class ContentFeedbackService {
  constructor(
    private dataSource: DataSource,
    private webhookHandler: WebhookHandler,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async postFeedback(args: ContentFeedbackPayload) {
    const waitIP = await this.checkIP(args.ip)

    if (!waitIP) {
      return waitIP
    }

    const checkFeedback = await this.storeFeedback({
      ip: args.ip,
      input: args.input,
      output: args.output,
      userId: args.userId as string,
      contentId: args.contentId as string,
      message: args.message as string,
      site: args.site as ContentFeedbackSite,
      feedback: args.feedback,
      reportType: args.reportType as ContentFeedbackType,
    })

    if (checkFeedback) {
      await this.webhookHandler.postWebhook(ActionTypes.CONTENT_FEEDBACK, {
        ip: args.ip,
        urlId: args.contentId,
        type: args.feedback,
        user: args.userId,
        title: args.site,
        description: args.message,
      } as WebhookPayload)
    }
    return checkFeedback
  }

  async storeFeedback(args: ContentFeedbackPayload): Promise<boolean> {
    const repository = this.dataSource.getRepository(Feedback)
    const id = `${args.ip}-${args.contentId || args.input}`
    const cached: string | undefined = await this.cacheManager.get(id)

    let check
    if (args.site === ContentFeedbackSite.IQSEARCH) {
      check = await repository
        .createQueryBuilder('feeback')
        .where(`feeback.content @> '{"input": "${args.input}"}'`)
        .getOne()
    } else {
      check = await repository.findOne({
        where: { contentId: args.contentId, ip: args.ip },
      })
    }

    if (cached || (check && check.feedback === args.feedback)) {
      return false
    }

    if (check && check.feedback !== args.feedback) {
      if (args.reportType) {
        await repository.query(
          `UPDATE feedback SET feedback = $1 where "contentId" = $2 AND ip = $3`,
          [args.feedback, args.contentId, args.ip],
        )
      } else {
        await repository.query(
          `UPDATE feedback SET feedback = $1 where "contentId" = $2 OR feeback.content @> '{"input": "$3"}' AND ip = $4`,
          [args.feedback, args.contentId, args.input, args.ip],
        )
      }
    }

    if (!check) {
      const newFeedback = repository.create({
        ...args,
        content: [
          {
            input: args.input,
            output: args.output,
          },
        ],
      } as unknown as Feedback)
      await repository.save(newFeedback)
    }
    await this.cacheManager.set(id, args.ip)
    return true
  }

  async checkIP(ip: string): Promise<boolean> {
    const cached: string | undefined = await this.cacheManager.get(ip)
    if (!cached) {
      await this.cacheManager.set(ip, ip, { ttl: 180 })
      return true
    }
    return false
  }
}

export default ContentFeedbackService
