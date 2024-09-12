import { CacheModule, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import BlogService from './blog.service'
import BlogResolver from './blog.resolver'

@Module({
    imports: [
        CacheModule.register
        ({
        ttl: 60 * 5,
        max: 100,
    }),
    ConfigModule,
    HttpModule,
],
    providers: [BlogService, BlogResolver],
    exports: [BlogService],
})
export default class BlogModule {}
