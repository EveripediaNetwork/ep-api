import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

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
    private configService: ConfigService,
  ) {}

  private getSecrets() {
    const secret = this.configService.get<string>('REVALIDATE_SECRET')
    const url = this.configService.get<string>('WEBSITE_URL')

    return { secret, url }
  }

  async revalidate(route: string, id?: string, slug?: string): Promise<any> {
    if (slug) {
      return this.httpService
        .get(
          `${this.getSecrets().url}api/revalidate?secret=${
            this.getSecrets().secret
          }&path=${route}/${slug}`,
        )
        .toPromise()
    }
    if (id) {
      return this.httpService
        .get(
          `${this.getSecrets().url}api/revalidate?secret=${
            this.getSecrets().secret
          }&path=${route}/${id}`,
        )
        .toPromise()
    }
    return this.httpService
      .get(
        `${this.getSecrets().url}api/revalidate?secret=${
          this.getSecrets().secret
        }&path=${route}`,
      )
      .toPromise()
  }

  async revalidatePage(page: RevalidateEndpoints, id?: string, slug?: string) {
    if (page === RevalidateEndpoints.STORE_WIKI) {
      await Promise.all([
        this.revalidate(Routes.ACTIVITY),
        this.revalidate(Routes.WIKI_PAGE, undefined, slug),
        this.revalidate(`/wiki/${slug}/history`),
      ])
      // await this.revalidate(Routes.USER_PAGE, id)
      console.log(`Revalidating ${page}`)
    }
    if (page === RevalidateEndpoints.PROMOTE_WIKI) {
      await this.revalidate(Routes.HOMEPAGE)
      console.log(`Revalidating ${page}`)
    }
    if (page === RevalidateEndpoints.HIDE_WIKI) {
      await Promise.all([
        this.revalidate(Routes.ACTIVITY),
        this.revalidate(Routes.WIKI_PAGE, undefined, slug),
      ])
      // await this.revalidate(Routes.USER_PAGE, id)
      console.log(`Revalidating ${page}`)
    }
    if (page === RevalidateEndpoints.CREATE_PROFILE) {
      // await this.revalidate(Routes.USER_PAGE, id)
      console.log(`Revalidating ${page}`)
    }
    console.log(`Revalidating ${page}`)
    return true
  }
}