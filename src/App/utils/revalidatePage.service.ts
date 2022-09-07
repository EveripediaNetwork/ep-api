import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'

export enum RevalidateEndpoints {
  WIKIS_HIDDEN = 'wikisHidden', // activity page
  PROMOTE_WIKI = 'promoteWiki', // homepage
  STORE_WIKI = 'storeWiki', // UserPage{id}, activityPage
  CREATE_PROFILE = 'createProfile', // userPage{id}
}

@Injectable()
export class RevalidatePageService {
  constructor(private httpService: HttpService) {}

  revalidatePage(page?: RevalidateEndpoints) {
    if (
      page === RevalidateEndpoints.STORE_WIKI 
    ) {
      // call activtiy page url
      // call user page url with id
      console.log(`Revalidating ${page}`)
    }
    if (page === RevalidateEndpoints.PROMOTE_WIKI) {
      // call homepage url
      console.log(`Revalidating ${page}`)
    }
    if (page === RevalidateEndpoints.WIKIS_HIDDEN) {
      // call activtiy page url
      // call user page url with id
      console.log(`Revalidating ${page}`)
    }
    if (page === RevalidateEndpoints.CREATE_PROFILE) {
      // call user profile url with id
      console.log(`Revalidating ${page}`)
    }
    console.log(`Revalidating ${page}`)
    return true
  }
}
