import { Controller, Get, Query } from '@nestjs/common'
import SearchService from './search.service'

@Controller('search')
export default class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query('query') query: string) {
    if (!query || !query.trim()) {
      return { error: 'Missing or empty query string' }
    }

    const results = await this.searchService.search(query)
    return { wikis: results }
  }
}
