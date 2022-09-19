import { Injectable } from '@nestjs/common'

@Injectable()
class FlagWikiService {

  async flagWiki() {
    return true
  }
}

export default FlagWikiService
