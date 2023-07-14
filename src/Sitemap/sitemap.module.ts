import { CacheModule, Module } from '@nestjs/common'
import SitemapController from './controllers/sitemap.controller'
import httpModule from '../httpModule'
import WikiService from '../App/Wiki/wiki.service'
import { ValidSlug } from '../App/utils/validSlug'
import CategoryService from '../App/Category/category.service'
import WebhookHandler from '../App/utils/discordWebhookHandler'

@Module({
  imports: [CacheModule.register({ ttl: 3600 }), httpModule(10000)],
  controllers: [SitemapController],
  providers: [WikiService, ValidSlug, CategoryService, WebhookHandler],
})
class SitemapModule {}

export default SitemapModule
