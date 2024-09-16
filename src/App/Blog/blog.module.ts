import { CacheModule, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import BlogService from './blog.service'
import BlogResolver from './blog.resolver'
import ArweaveModule from './areave.module'
import ArweaveService from './arweave.service'
import MirrorApiService from './mirrorApi.service'
import MirrorApiModule from './mirrorApi.module'

@Module({
    imports: [
        CacheModule.register
        ({
        ttl: 60 * 5,
        max: 100,
    }),
    ConfigModule,
    HttpModule,
    ArweaveModule,
    MirrorApiModule,
],
    providers: [BlogService, BlogResolver, ArweaveService, MirrorApiService],
    exports: [BlogService],
})
export default class BlogModule {}
