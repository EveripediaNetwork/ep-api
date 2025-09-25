import { Controller, Get, Query } from '@nestjs/common'
import WikiService from '../wiki.service'
import { TimeInterval } from '../wiki.dto'

@Controller('wiki')
class WikiController {
  constructor(private wikiService: WikiService) {}

  @Get()
  async wikiIdTitleAndSummary(
    @Query('interval') interval?: TimeInterval,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.wikiService.getWikiIdTitleAndSummary({
      interval,
      startDate,
      endDate,
    })
  }
}
export default WikiController
