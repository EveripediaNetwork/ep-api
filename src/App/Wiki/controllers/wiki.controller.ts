import { Controller, Get, Query } from '@nestjs/common'
import WikiService from '../wiki.service'
import { TimeInterval } from '../wiki.dto'

@Controller('wiki')
class WikiController {
  constructor(private wikiService: WikiService) {}

  @Get()
  async wikiIdTitleAndSummary() {
    return this.wikiService.getWikiIdTitleAndSummary()
  }
  @Get('outdated')
  async outDatedWikis(
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Query('interval') interval?: TimeInterval,
  ) {
    return this.wikiService.getOutdatedWikis(
      parseInt(String(limit), 10),
      parseInt(String(offset), 10),
      interval,
    )
  }
}
export default WikiController
