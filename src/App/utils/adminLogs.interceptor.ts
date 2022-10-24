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
import WebhookHandler, { ActionTypes } from './discordWebhookHandler'
import TokenValidator from './validateToken'

export class AdminLogPayload {
  address!: string

  endpoint!: string

  id!: string

  status?: boolean
}

export enum AdminMutations {
  PROMOTE_WIKI = 'promoteWiki',
  HIDE_WIKI = 'hideWiki',
  UNHIDE_WIKI = 'unhideWiki',
  REVALIDATE_PAGE = 'revalidatePage',
  TOGGLE_USER_STATE = 'toggleUserStateById',
}

@Injectable()
export default class AdminLogsInterceptor implements NestInterceptor {
  constructor(
    private webhookHandler: WebhookHandler,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private tokenValidator: TokenValidator,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<boolean>> {
    const ctx = GqlExecutionContext.create(context)
    const { authorization } = ctx.getContext().req.headers
    const id = this.tokenValidator.validateToken(
      authorization,
      undefined,
      false,
    )

    const adminPayload = new AdminLogPayload()
    adminPayload.address = id
    adminPayload.endpoint = ctx.getArgByIndex(3).fieldName
    adminPayload.status =
      ctx.getArgByIndex(3).fieldName === AdminMutations.TOGGLE_USER_STATE
        ? ctx.getArgByIndex(1).active
        : undefined
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

  @OnEvent('admin.action', { async: true })
  async sendAdminLog(cacheId: string) {
    const payload = await this.cacheManager.get(cacheId)
    if (payload) {
      await this.webhookHandler.postWebhook(
        ActionTypes.ADMIN_ACTION,
        undefined,
        undefined,
        payload as AdminLogPayload,
      )
      await this.cacheManager.del(`${cacheId}`)
    }
    return true
  }
}
