import { Module } from '@nestjs/common'
import SitemapController from './controllers/sitemap.controller'
import httpModule from '../httpModule'
import WikiService from '../App/Wiki/wiki.service'
import { ValidSlug } from '../App/utils/validSlug'
import CategoryService from '../App/Category/category.service'

@Module({
  imports: [httpModule(10000)],
  controllers: [SitemapController],
  providers: [WikiService, ValidSlug, CategoryService],
})
class SitemapModule {}

export default SitemapModule
