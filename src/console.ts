import { CommandFactory } from 'nest-commander'
import IndexerModule from './Indexer/indexer.module'

async function bootstrap() {
  await CommandFactory.run(IndexerModule)

}

bootstrap()
