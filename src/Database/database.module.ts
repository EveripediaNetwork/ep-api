import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import Wiki from './Entities/wiki.entity'
import Tag from './Entities/tag.entity'
import Category from './Entities/category.entity'
import User from './Entities/user.entity'
import Language from './Entities/language.entity'
import Activity from './Entities/activity.entity'
import UserProfile from './Entities/userProfile.entity'
import IqSubscription from './Entities/IqSubscription'
import Notification from './Entities/notification.entity'
import PageviewsPerDay from './Entities/pageviewsPerPage.entity'
import Feedback from './Entities/feedback.entity'
import BrainPass from './Entities/brainPass.entity'
import Treasury from './Entities/treasury.entity'
import StakedIQ from './Entities/stakedIQ.entity'
import HiIQHolderAddress from './Entities/hiIQHolderAddress.entity'
import HiIQHolder from './Entities/hiIQHolder.entity'
import IQHolderAddress from './Entities/iqHolderAddress.entity'
import IQHolder from './Entities/iqHolder.entity'
import MarketCapIds from './Entities/marketCapIds.entity'
import Events from './Entities/Event.entity'
import Explorer from './Entities/explorer.entity'
import HiddenBlog from '../App/Blog/hideBlog.entity'
import WikiKoreanTranslation from './Entities/wikiKoreanTranslation.entity'
import { Draft } from './Entities/draft.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        port: 5432,
        host: configService.get('DATABASE_HOST'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASS'),
        database: configService.get('DATABASE_NAME'),
        entities: [
          Wiki,
          Tag,
          Category,
          User,
          Language,
          Activity,
          UserProfile,
          IqSubscription,
          Notification,
          PageviewsPerDay,
          Feedback,
          BrainPass,
          Treasury,
          StakedIQ,
          HiIQHolder,
          HiIQHolderAddress,
          IQHolder,
          IQHolderAddress,
          MarketCapIds,
          Events,
          Explorer,
          HiddenBlog,
          WikiKoreanTranslation,
          Draft,
        ],
        synchronize: true,
        keepConnectionAlive: true,
        logging: ['error'],
      }),
      inject: [ConfigService],
    }),
  ],
})
class DatabaseModule {}

export default DatabaseModule
