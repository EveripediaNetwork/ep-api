import { HttpService } from '@nestjs/axios'
import { Injectable, Inject } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { Cache } from 'cache-manager'
import { Cron, CronExpression } from '@nestjs/schedule'
import { firstValueFrom } from 'rxjs'
import { RankType } from '../marketCap/marketcap.dto'
import Category from '../../Database/Entities/category.entity'
import Wiki from '../../Database/Entities/wiki.entity'

export enum RevalidateEndpoints {
  HIDE_WIKI = 'hideWiki',
  PROMOTE_WIKI = 'promoteWiki',
  STORE_WIKI = 'storeWiki',
  CREATE_PROFILE = 'createProfile',
}

export enum Routes {
  HOMEPAGE = '/',
  ACTIVITY = '/activity',
  EVENTS = '/events',
  WIKI_PAGE = '/wiki',
  USER_PAGE = '/account',
}

export interface RevalidateStatus {
  revalidated: string
  path: Routes
}

@Injectable()
export class RevalidatePageService {
  private failedUrls = new Map()

  constructor(
    private httpService: HttpService,
    private dataSource: DataSource,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getSecrets() {
    const secret = this.configService.get<string>('REVALIDATE_SECRET')
    const url = this.configService.get<string>('WEBSITE_URL')

    return { secret, url }
  }

  async revalidate(route: string, id?: string, slug?: string): Promise<any> {
    const { url, secret } = this.getSecrets()

    const revalidateUrl = `${url}/api/revalidate?secret=${secret}`

    let path = route

    if (slug) {
      path += `/${slug}`
    } else if (id) {
      path += `/${id}`
    }

    const urlsToRevalidate = [
      `${revalidateUrl}&path=/en${path}`,
      `${revalidateUrl}&path=/zh${path}`,
      `${revalidateUrl}&path=/ko${path}`,
    ]

    await Promise.all(
      urlsToRevalidate.map(async (urlToRevalidate) => {
        try {
          await this.httpService.get(urlToRevalidate).toPromise()
        } catch (e: any) {
          console.error(
            'Error revalidating path',
            e.response?.config?.url || e.message,
            urlToRevalidate,
          )
          this.failedUrls.set(urlToRevalidate, 3)
        }
      }),
    )
    return true
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async retryFailedUrl() {
    for (const [k, v] of this.failedUrls) {
      if (v > 0) {
        try {
          await Promise.all(
            k.map(async (url: string) => {
              const { data } = await firstValueFrom(
                this.httpService.get(url).pipe(),
              )

              if (data && data.revalidated === true) {
                console.log(`♻️ ♻️ Successfully revalidated: ${url}`)
              }
            }),
          )

          this.failedUrls.delete(k)
        } catch (error: any) {
          this.failedUrls.set(k, v - 1)
        }
      } else {
        this.failedUrls.delete(k)
      }
    }
  }

  async revalidatePage(
    page: RevalidateEndpoints,
    id?: string,
    slug?: string,
    level?: number,
    events = false,
  ) {
    try {
      if (page === RevalidateEndpoints.STORE_WIKI) {
        if ((level && level > 0) || (await this.checkCategory(slug))) {
          await this.revalidate(Routes.HOMEPAGE)
        }
        await Promise.all([
          this.revalidate(Routes.ACTIVITY),
          this.revalidate(Routes.EVENTS),
          this.revalidate(Routes.WIKI_PAGE, undefined, slug),
          events && this.revalidate(Routes.EVENTS, undefined, slug),
          this.revalidate(`/wiki/${slug}/history`),
          this.revalidate(`/wiki/${slug}/events`),
        ])
      }
      if (page === RevalidateEndpoints.PROMOTE_WIKI) {
        await this.revalidate(Routes.HOMEPAGE)
      }
      if (page === RevalidateEndpoints.HIDE_WIKI) {
        if (level && level > 0) {
          await this.revalidate(Routes.HOMEPAGE)
        }
        await Promise.all([
          this.revalidate(Routes.ACTIVITY),
          this.revalidate(Routes.WIKI_PAGE, undefined, slug),
          events && this.revalidate(Routes.EVENTS, undefined, slug),
        ])
      }
    } catch (e: any) {
      console.error('Failed to revalidate page')
    }
  }

  async checkCategory(id: string | undefined): Promise<boolean | undefined> {
    const wikiRepository = this.dataSource.getRepository(Wiki)
    if (!id) {
      return false
    }

    const i = await wikiRepository.findOne({
      where: {
        id,
        hidden: false,
      },
      loadRelationIds: true,
    })
    const category = await Promise.resolve(i?.categories)
    let state
    if (category) {
      state =
        category[0] === ('cryptocurrencies' as unknown as Category) ||
        category[0] === ('nfts' as unknown as Category)
    }

    if (state) {
      await this.cacheManager.del(`finalResult/${RankType.NFT}/10/1`)
      await this.cacheManager.del(`finalResult/${RankType.TOKEN}/10/1`)
    }

    return state
  }
}
