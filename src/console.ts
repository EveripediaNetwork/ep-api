/* eslint-disable no-console */
import { CommandFactory } from 'nest-commander'
import IndexerModule from './Indexer/indexer.module'

async function bootstrapConsole() {
//   try {
//     await CommandFactory.run(IndexerModule)
//   } catch (err) {
//     console.error(err)
//   }
    await CommandFactory.run(IndexerModule, {
      errorHandler: (err) => {
        console.error(err)
      },
    })
}

if (require.main === module) {
  bootstrapConsole()
}

export default bootstrapConsole
