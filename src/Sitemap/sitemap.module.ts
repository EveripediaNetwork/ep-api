import { Module } from '@nestjs/common'

import SitemapController from './controllers/sitemap.controller'
import httpModule from '../httpModule'
import ActivityService from '../App/activity.service'

@Module({
  imports: [httpModule(10000)],
  controllers: [SitemapController],
  providers: [ActivityService],
})
class SitemapModule {}

export default SitemapModule
