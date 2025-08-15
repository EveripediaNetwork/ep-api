import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import DatabaseModule from '../../Database/database.module'
import WikiTranslationService from './translation.service'
import WikiTranslationResolver from './translation.resolver'
import WikiKoreanTranslation from '../../Database/Entities/wikiKoreanTranslation.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import BulkTranslateCommand from '../../commands/bulk-translate.command'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([WikiKoreanTranslation, Wiki]),
  ],
  providers: [
    WikiTranslationService,
    WikiTranslationResolver,
    BulkTranslateCommand,
  ],
  exports: [WikiTranslationService],
})
export default class TranslationModule {}
