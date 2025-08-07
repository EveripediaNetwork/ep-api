import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import WikiTranslationService from './translation.service'
import WikiTranslationResolver from './translation.resolver'
import WikiKoreanTranslation from '../../Database/Entities/wikiKoreanTranslation.entity'
import Wiki from '../../Database/Entities/wiki.entity'

@Module({
  imports: [TypeOrmModule.forFeature([WikiKoreanTranslation, Wiki])],
  providers: [WikiTranslationService, WikiTranslationResolver],
  exports: [WikiTranslationService],
})
export default class TranslationModule {}
