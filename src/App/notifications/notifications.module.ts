import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import NotificationsProcessor from './notifications.processor'
import NotificationsController from './notifications.controller'

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsProcessor],
})
export default class NotificationsModule {}
