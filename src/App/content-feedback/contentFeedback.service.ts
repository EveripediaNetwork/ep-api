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
      content: args.content,
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
    const id = `${args.ip}-${args.contentId || args.content}`
    const cached: string | undefined = await this.cacheManager.get(id)

    const query =
      args.site === ContentFeedbackSite.IQSEARCH
        ? { content: args.content, ip: args.ip }
        : { contentId: args.contentId, ip: args.ip }

    const check = await repository.findOne({ where: query })
    
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
          `UPDATE feedback SET feedback = $1 where "contentId" = $2 OR content = $3 AND ip = $4`,
          [args.feedback, args.contentId, args.content, args.ip],
        )
      }
    }

    if (!check) {
      const newFeedback = repository.create({
        ...args,
      } as Feedback)
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
