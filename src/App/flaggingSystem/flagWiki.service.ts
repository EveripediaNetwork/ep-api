import { Injectable } from '@nestjs/common'

export interface FlagWikiWebhook {
  errorMessage: string
  wikiId: string
  userId: string
}

@Injectable()
class FlagWikiService {
  async flagWiki(report: string, wikiId: string, userId?: string) {
    console.log(report, wikiId, userId)
    return true
  }
}

export default FlagWikiService
