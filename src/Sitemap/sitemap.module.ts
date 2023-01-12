import { Module } from '@nestjs/common'
import SitemapController from './controllers/sitemap.controller'
import httpModule from '../httpModule'
import WikiService from '../App/wiki.service'
import CategoryService from '../App/category.service'

@Module({
  imports: [httpModule(10000)],
  controllers: [SitemapController],
  providers: [WikiService, CategoryService],
})
class SitemapModule {}

export default SitemapModule
