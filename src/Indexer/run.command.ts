/* eslint-disable no-console */

// TODO: refactor towards linting rules when doing this
// TODO: remember to review the eslint-api config file when doing so

import { Command, CommandRunner, Option } from 'nest-commander'
import { Connection } from 'typeorm'
import GraphProviderService from './Provider/graph.service'
import IPFSGetterService from './IPFSGetter/ipfs-getter.service'
import IPFSValidatorService from './Validator/validator.service'
import DBStoreService, { ValidWiki } from './Store/store.service'
import Wiki from '../Database/Entities/wiki.entity'

interface CommandOptions {
  unixtime: number
}

const SLEEP_TIME = 4000

@Command({ name: 'indexer', description: 'A blockchain indexer' })
class RunCommand implements CommandRunner {
  constructor(
    private providerService: GraphProviderService,
    private ipfsGetter: IPFSGetterService,
    private validator: IPFSValidatorService,
    private dbStoreService: DBStoreService,
    private connection: Connection,
  ) {}

  async run(passedParam: string[], options?: CommandOptions): Promise<void> {
    let unixtime = 0
    if (options?.unixtime === undefined) {
      const repo = this.connection.getRepository(Wiki)
      const lastWikiEdited = await repo.find({
        order: {
          updated: 'DESC',
        },
        take: 1,
      })
      unixtime = Math.floor(
        new Date(lastWikiEdited[0].updated).getTime() / 1000,
      )
    } else {
      unixtime = options.unixtime
    }

    const hashes = await this.providerService.getIPFSHashesFromBlock(unixtime)
    for (const hash of hashes) {
      try {
        const content = await this.ipfsGetter.getIPFSDataFromHash(hash.id)
        if (this.validator.validate(/* content */)) {
          // TODO: Unfinished validator
          await this.dbStoreService.storeWiki(content as ValidWiki, hash)
          console.log(`🚀 Storing IPFS: ${hash.id}`)
        } else {
          console.error(`🔥 Invalid IPFS: ${hash.id}`)
        }
        await new Promise(r => setTimeout(r, SLEEP_TIME))
      } catch (ex) {
        console.error(`🛑 Invalid IPFS: ${hash.id}`)
        console.error(ex)
      }
    }
    process.exit()
  }

  @Option({
    flags: '-u, --unixtime [unixtime]',
    description: 'unixtime to start with indexing',
  })
  parseNumber(val: string): number {
    return Number(val)
  }
}

export default RunCommand
