import { Injectable } from '@nestjs/common'

@Injectable()
class FlagWikiService {
  async flagWiki(report: string, wikiId: string, userId?: string) {
    console.log(report, wikiId, userId)
    return true
  }
}

export default FlagWikiService
