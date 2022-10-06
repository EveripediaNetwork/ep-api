/* eslint-disable import/no-cycle */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  CACHE_MANAGER,
  Inject,
} from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { GqlExecutionContext } from '@nestjs/graphql'
import { Observable } from 'rxjs'
import { Cache } from 'cache-manager'
import WebhookHandler, { ChannelTypes } from './discordWebhookHandler'
// import validateToken from './validateToken'

export class AdminLogPayload {
  address!: string

  endpoint!: string

  id!: string
}

export enum AdminMutations {
  PROMOTE_WIKI = 'promoteWiki',
  HIDE_WIKI = 'hideWiki',
  UNHIDE_WIKI = 'unhideWiki',
  REVALIDATE_PAGE = 'revalidatePage',
}

@Injectable()
export default class AdminLogsInterceptor implements NestInterceptor {
  constructor(
    private webhookHandler: WebhookHandler,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<boolean>> {
    const ctx = GqlExecutionContext.create(context)
    const { authorization } = ctx.getContext().req.headers
    // const id = validateToken(authorization)

    const adminPayload = new AdminLogPayload()
    adminPayload.address = authorization
    adminPayload.endpoint = ctx.getArgByIndex(3).fieldName
    adminPayload.id =
      ctx.getArgByIndex(3).fieldName === AdminMutations.REVALIDATE_PAGE
        ? ctx.getArgByIndex(1).route
        : ctx.getArgByIndex(1).id

    await this.cacheManager.set(
      `${ctx.getArgByIndex(2).req.ip + adminPayload.id}`,
      adminPayload,
    )

    return next.handle().pipe()
  }

  @OnEvent('admin.action')
  async sendAdminLog(cacheId: string) {
    const payload = await this.cacheManager.get(cacheId)
    if (payload) {
      console.log(payload)
      await this.webhookHandler.postWebhook(
        ChannelTypes.ADMIN_ACTION,
        undefined,
        undefined,
        payload as AdminLogPayload,
      )
    }

    console.log('We have a lift off')

    return true
  }
}
