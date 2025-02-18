import { Inject, Injectable } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { DataSource } from 'typeorm'
import { ActionTypes, WebhookPayload } from '../utils/utilTypes'
import WebhookHandler from '../utils/discordWebhookHandler'
import { ContentFeedbackPayload, RatingArgs } from './contentFeedback.dto'
import Feedback, {
  RatingsAverage,
  RatingsCount,
} from '../../Database/Entities/feedback.entity'
import ContentFeedbackSite from '../../Database/Entities/types/IFeedback'

@Injectable()
class ContentFeedbackService {
  constructor(
    private dataSource: DataSource,
    private webhookHandler: WebhookHandler,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getRating(args: RatingArgs) {
    const { contentId, userId, ip } = args
    const repository = this.dataSource.getRepository(Feedback)
    if (userId) {
      return repository.findOneBy({ contentId, userId })
    }
    return repository.findOneBy({ contentId, ip })
  }

  async averageRating(id: string): Promise<RatingsAverage | null> {
    const repository = this.dataSource.getRepository(Feedback)
    const average = await repository.query(
      `
        SELECT "contentId", ROUND(AVG(rating), 2) AS average, count("contentId") as votes
        FROM feedback
        WHERE "contentId" = $1
        GROUP BY "contentId";
    `,
      [id],
    )
    return average.length > 0 ? (average[0] as RatingsAverage) : null
  }

  async ratingsCount(contentId?: string) {
    const repository = this.dataSource.getRepository(Feedback)
    const count = await repository.query(
      `
        SELECT "contentId", rating, COUNT(*) as rated_count
        FROM feedback
        WHERE ("contentId" = $1 OR $1 IS NULL)
        GROUP BY "contentId", rating
        ORDER BY rated_count DESC
        LIMIT 50

    `,
      [contentId],
    )
    if (count.length < 1) {
      return null
    }
    return count.map((e: { rated_count: number }) => ({
      ...e,
      count: e.rated_count,
    })) as RatingsCount
  }

  async postFeedback(args: ContentFeedbackPayload) {
    const waitIP = await this.checkIP(args.ip)

    if (!waitIP) {
      return waitIP
    }

    const checkFeedback = await this.storeFeedback({
      ip: args.ip,
      input: args.input,
      output: args.output,
      rating: args.rating,
      userId: args.userId as string,
      contentId: args.contentId as string,
      message: args.message as string,
      site: args.site as ContentFeedbackSite,
      reportType: args.reportType,
    })

    if (checkFeedback) {
      await this.webhookHandler.postWebhook(ActionTypes.CONTENT_FEEDBACK, {
        ip: args.ip,
        urlId: args.contentId,
        user: args.userId,
        rating: args.rating,
        title: args.site,
        reportSubject: args.reportType,
        description: args.message,
      } as WebhookPayload)
    }
    return checkFeedback
  }

  async storeFeedback(args: ContentFeedbackPayload): Promise<boolean> {
    const repository = this.dataSource.getRepository(Feedback)
    const id = `${args.ip}-${args.contentId || args.input}`

    let check
    if (args.site === ContentFeedbackSite.IQSEARCH) {
      check = await repository
        .createQueryBuilder('feeback')
        .where('feeback.content @> :input', {
          input: `[{"input":"${args.input}"}]`,
        })
        .getOne()
    } else {
      check = await repository.findOne({
        where: { contentId: args.contentId, ip: args.ip },
      })
    }

    if (
      check &&
      check.rating === args.rating &&
      !(args.site === ContentFeedbackSite.IQSOCIAL)
    ) {
      return false
    }

    if (check && check.rating !== args.rating) {
      if (args.reportType) {
        await repository.query(
          `UPDATE feedback SET rating = $1 where "contentId" = $2 AND ip = $3`,
          [args.rating, args.contentId, args.ip],
        )
      } else {
        await repository.query(
          'UPDATE feedback SET rating = $1 where "contentId" = $2 OR feedback.content @> $3 AND ip = $4',
          [
            args.rating,
            args.contentId,
            `[{ "input":"${args.input}"}]`,
            args.ip,
          ],
        )
      }
    }

    const content =
      args.input && args.output
        ? [
            {
              input: args.input,
              output: args.output,
            },
          ]
        : null

    if (!check) {
      const newFeedback = repository.create({
        ...args,
        content,
      } as unknown as Feedback)
      await repository.save(newFeedback)
    }
    await this.cacheManager.set(id, args.ip)
    return true
  }

  async checkIP(ip: string): Promise<boolean> {
    const cached: string | null | undefined = await this.cacheManager.get(ip)
    if (!cached) {
      await this.cacheManager.set(ip, ip, 60 * 1000)
      return true
    }
    return false
  }
}

export default ContentFeedbackService
