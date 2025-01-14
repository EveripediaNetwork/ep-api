import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { TypeOrmModule } from '@nestjs/typeorm'
import BlogService from './blog.service'
import BlogResolver from './blog.resolver'
import MirrorApiService from './mirrorApi.service'
import HiddenBlog from './hideBlog.entity'

@Module({
  imports: [ConfigModule, HttpModule, TypeOrmModule.forFeature([HiddenBlog]),],
  providers: [BlogService, BlogResolver, MirrorApiService],
  exports: [BlogService, MirrorApiService],
})
export default class BlogModule {}
