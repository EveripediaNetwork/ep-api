import { Injectable } from '@nestjs/common'

export enum RevalidateEndpoints {
  WIKIS_HIDDEN = 'wikisHidden', // activity page
  PROMOTE_WIKI = 'promoteWiki', // homepage
  STORE_WIKI = 'storeWiki', // UserPage{id}, activityPage
  CREATE_PROFILE = 'createProfile', // userPage{id}
  CREATE_WIKI = 'createWiki',
  UPDATE_WIKI = 'updateWiki',
}

@Injectable()
export class RevalidatePageService {
  revalidatePage(page?: RevalidateEndpoints) {
    console.log(page)
    if (
      page === RevalidateEndpoints.CREATE_WIKI ||
      page === RevalidateEndpoints.UPDATE_WIKI
    ) {
      // call activtiy page url
      console.log(`Revalidating ${page}`)
      return 'heree'
    }
    if (page === RevalidateEndpoints.PROMOTE_WIKI) {
      // call homepage url
      console.log(`Revalidating ${page}`)
      return 'heree'
    }
    console.log(`Revalidating ${page}`)
    return 'heree'
  }
}
