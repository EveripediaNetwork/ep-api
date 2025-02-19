import { CommandFactory } from 'nest-commander'
import NotificationsModule from './App/notifications/notifications.module'

async function bootstrapConsoleMail() {

    await CommandFactory.run(NotificationsModule, {
      errorHandler: (err) => {
        console.error(err)
      },
    })
  
  // try {
  //   await CommandFactory.run(NotificationsModule)
  // } catch (err) {
  //   console.error(err)
  // }
}

if (require.main === module) {
  bootstrapConsoleMail()
}

export default bootstrapConsoleMail
