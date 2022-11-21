import { CommandFactory } from 'nest-commander'
import NotificationsModule from './App/notifications/notifications.module'

async function bootstrap() {
  await CommandFactory.run(NotificationsModule)
}

bootstrap()
