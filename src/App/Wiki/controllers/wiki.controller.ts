import { Controller, Get } from '@nestjs/common'
import WikiService from '../wiki.service'

@Controller('wiki')
class WikiController {
  constructor(private wikiService: WikiService) {}

  @Get()
  async wikiIdTitleAndSummary() {
    return this.wikiService.getWikiIdTitleAndSummary()
  }
}
export default WikiController
