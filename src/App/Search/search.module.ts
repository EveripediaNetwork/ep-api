import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import SearchService from './search.service'
import SearchResolver from './search.resolver'
import WikiService from '../Wiki/wiki.service'
import { ValidSlug } from '../utils/validSlug'
import DiscordModule from '../utils/discord.module'
import TranslationModule from '../Translation/translation.module'
import SearchEvaluator from './search-evaluator.service'
import LoopSearchService from './loop-search.service'

@Module({
  imports: [HttpModule, ConfigModule, DiscordModule, TranslationModule],
  providers: [
    SearchService,
    SearchResolver,
    ValidSlug,
    WikiService,
    SearchEvaluator,
    LoopSearchService,
  ],
  exports: [SearchService],
})
export default class SearchModule {}
