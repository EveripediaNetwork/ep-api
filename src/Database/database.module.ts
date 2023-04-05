import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import Wiki from "./Entities/wiki.entity";
import Tag from "./Entities/tag.entity";
import Category from "./Entities/category.entity";
import User from "./Entities/user.entity";
import Language from "./Entities/language.entity";
import Activity from "./Entities/activity.entity";
import UserProfile from "./Entities/userProfile.entity";
import IqSubscription from "./Entities/IqSubscription";
import Notification from "./Entities/notification.entity";
import PageviewsPerDay from "./Entities/pageviewsPerPage.entity";
import ContentFeedback from "./Entities/contentFeedback.entity";

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
          ContentFeedback,
        ],
        synchronize: true,
        keepConnectionAlive: true,
        // logging: true,
      }),
      inject: [ConfigService],
    }),
  ],
})
class DatabaseModule {}

export default DatabaseModule;
