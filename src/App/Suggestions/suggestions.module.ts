import { Module } from '@nestjs/common'
import SuggestionsResolver from './suggestions.resolver'
import SuggestionsService from './suggestions.service'

@Module({
  providers: [SuggestionsResolver, SuggestionsService],
  exports: [SuggestionsService],
})
export default class SuggestionsModule {}
