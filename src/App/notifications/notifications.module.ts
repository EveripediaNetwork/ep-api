import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import DatabaseModule from '../../Database/database.module'
import httpModule from '../../httpModule'
import NotificationsCommand from './notifications.command'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    httpModule(20000),
  ],
  controllers: [],
  providers: [NotificationsCommand],
})
class NotificationsModule {}

export default NotificationsModule
