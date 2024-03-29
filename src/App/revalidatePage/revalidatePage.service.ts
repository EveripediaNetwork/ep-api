import { HttpService } from '@nestjs/axios'
import { Injectable, CACHE_MANAGER, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { Cache } from 'cache-manager'
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
  WIKI_PAGE = '/wiki',
  USER_PAGE = '/account',
}

export interface RevalidateStatus {
  revalidated: string
  path: Routes
}

@Injectable()
export class RevalidatePageService {
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
    const urlEN = `${url}/api/revalidate?secret=${secret}`
    const urlKO = `${url}/KO/api/revalidate?secret=${secret}`

    let path = route

    if (slug) {
      path += `/${slug}`
    } else if (id) {
      path += `/${id}`
    }

    try {
      await Promise.all([
        this.httpService.get(`${urlEN}&path=${path}`).toPromise(),
        this.httpService.get(`${urlKO}&path=${path}`).toPromise(),
      ])
    } catch (e: any) {
      console.error('Error revalidating path', e.response.config.url)
    }
    return true
  }

  async revalidatePage(
    page: RevalidateEndpoints,
    id?: string,
    slug?: string,
    level?: number,
  ) {
    try {
      if (page === RevalidateEndpoints.STORE_WIKI) {
        if ((level && level > 0) || (await this.checkCategory(slug))) {
          await this.revalidate(Routes.HOMEPAGE)
        }
        await Promise.all([
          this.revalidate(Routes.ACTIVITY),
          this.revalidate(Routes.WIKI_PAGE, undefined, slug),
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
