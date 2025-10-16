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
    @Query('sort') sort: 'ASC' | 'DESC',
    @Query('interval') interval?: TimeInterval,
    @Query('search') search?: string,
  ) {
    return this.wikiService.getOutdatedWikis(
      parseInt(String(limit), 10),
      parseInt(String(offset), 10),
      sort,
      interval,
      search,
    )
  }
}
export default WikiController
