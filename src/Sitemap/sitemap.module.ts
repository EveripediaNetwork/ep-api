import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import SitemapController from './controllers/sitemap.controller'
import httpModule from '../httpModule'
import WikiService from '../App/Wiki/wiki.service'
import { ValidSlug } from '../App/utils/validSlug'
import CategoryService from '../App/Category/category.service'
import DiscordModule from '../App/utils/discord.module'

@Module({
  imports: [CacheModule.register({ ttl: 3600 * 1000 }), httpModule(10000), DiscordModule],
  controllers: [SitemapController],
  providers: [WikiService, ValidSlug, CategoryService],
})
class SitemapModule {}

export default SitemapModule
