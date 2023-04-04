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
import TokenValidator from './validateToken'
import { ActionTypes, AdminLogPayload, AdminMutations, WebhookPayload } from './utilTypes'
import WebhookHandler from './discordWebhookHandler'

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
    const actionType = ctx.getInfo().fieldName

    if (!Object.values(AdminMutations).includes(actionType)) {
      return next.handle().pipe()
    }
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
    const payload: AdminLogPayload | undefined = await this.cacheManager.get(cacheId)
    if (payload) {
      await this.webhookHandler.postWebhook(
        ActionTypes.ADMIN_ACTION,
        {
            user: payload.address,
            urlId: payload.id,
            adminAction: payload.endpoint,
            choice: payload.status
        } as WebhookPayload
      )
      await this.cacheManager.del(`${cacheId}`)
    }
    return true
  }
}
