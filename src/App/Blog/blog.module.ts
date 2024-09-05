import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BlogController } from './blog.controller'
import { BlogService } from './blog.service'
import { ArweaveService } from './arweave.service'

@Module({
    imports: [ConfigModule],
    controllers: [BlogController],
    providers: [BlogService, ArweaveService],
    exports: [BlogService],
})
export class BlogModule {}
