import { Command, CommandRunner, Option } from 'nest-commander'
import { Connection } from 'typeorm'
import GraphProviderService, { Hash } from './Provider/graph.service'
import IPFSGetterService from './IPFSGetter/ipfs-getter.service'
import IPFSValidatorService from './Validator/validator.service'
import DBStoreService, { ValidWiki } from './Store/store.service'
import Wiki from '../Database/Entities/wiki.entity'

interface CommandOptions {
  unixtime: number
  loop: boolean
}

const SLEEP_TIME = 5000

@Command({ name: 'indexer', description: 'A blockchain indexer' })
class RunCommand implements CommandRunner {
  constructor(
    private providerService: GraphProviderService,
    private ipfsGetter: IPFSGetterService,
    private validator: IPFSValidatorService,
    private dbStoreService: DBStoreService,
    private connection: Connection,
  ) {}

  async initiateIndexer(
    hashes: Hash[],
    loop: boolean,
    unixtime: number,
  ): Promise<void> {
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

        if (loop) {
          const newHashes = await this.providerService.getIPFSHashesFromBlock(
            unixtime,
          )

          await this.initiateIndexer(newHashes, loop, unixtime)
        }


      } catch (ex) {
        console.error(`🛑 Invalid IPFS: ${hash.id}`)
        console.error(ex)
      }
    }
  }

  async run(passedParam: string[], options?: CommandOptions): Promise<void> {
    let unixtime = 0
    const loop = options?.loop || false

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

    await this.initiateIndexer(hashes, loop, unixtime)

    process.exit()
  }

  @Option({
    flags: '-u, --unixtime [unixtime]',
    description: 'unixtime to start with indexing',
  })
  parseNumber(val: string): number {
    return Number(val)
  }

  @Option({
    flags: '-l, --loop [boolean]',
    description: 'keeps the command running in a loop',
  })
  parseBoolean(val: string): boolean {
    return JSON.parse(val)
  }
}

export default RunCommand
