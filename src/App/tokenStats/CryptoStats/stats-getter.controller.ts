import { Body, Controller, Get } from '@nestjs/common'

import StatsGetterService from './stats-getter.service'

interface Getter {
  name: string
}

@Controller('stats')
class StatsGetterController {
  constructor(private statsGetterService: StatsGetterService) {}

  @Get()
  async relay(@Body() body: Getter): Promise<string> {
    return this.statsGetterService.getStats(body.name)
  }
}
export default StatsGetterController
