import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { ConfigModule } from '@nestjs/config'
import DatabaseModule from '../../Database/database.module'
import httpModule from '../../httpModule'
import MailModule from '../mailer/mail.module'
import MailService from '../mailer/mail.service'
import NotificationsCommand from './notifications.command'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    CacheModule.register(),
    httpModule(20000),
    MailModule,
  ],
  controllers: [],
  providers: [NotificationsCommand, MailService],
})
class NotificationsModule {}

export default NotificationsModule
