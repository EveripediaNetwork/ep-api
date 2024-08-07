import { Controller, Get } from '@nestjs/common'
import WikiService from '../wiki.service'

@Controller('wiki')
class WikiController {
  constructor(private wikiService: WikiService) {}

  @Get()
  async wikiIdAndTitle() {
    return this.wikiService.getWikiIdAndTitle()
  }
}
export default WikiController
