import { Module } from '@nestjs/common'
import SitemapController from './controllers/sitemap.controller'
import httpModule from '../httpModule'
import WikiService from '../App/wikis.service'

@Module({
  imports: [httpModule(10000)],
  controllers: [SitemapController],
  providers: [WikiService],
})
class SitemapModule {}

export default SitemapModule
