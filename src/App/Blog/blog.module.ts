import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import BlogService from './blog.service'
import BlogResolver from './blog.resolver'
import MirrorApiService from './mirrorApi.service'

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [BlogService, BlogResolver, MirrorApiService],
  exports: [BlogService, MirrorApiService],
})
export default class BlogModule {}
