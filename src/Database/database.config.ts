import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'

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

export default class TypeOrmConfig {
  static getOrmConfig(configService: ConfigService): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      port: 5432,
      host: configService.get('DATABASE_HOST'),
      username: configService.get('DATABASE_USERNAME'),
      password: configService.get('DATABASE_PASS'),
      database: configService.get('DATABASE_NAME'),
      logger: 'advanced-console',
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
      ],
      synchronize: true, // TODO: false in prod
      keepConnectionAlive: true,
    }
  }
}

export const ormConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],

  useFactory: async (
    configService: ConfigService,
  ): Promise<TypeOrmModuleOptions> => TypeOrmConfig.getOrmConfig(configService),

  inject: [ConfigService],
}
