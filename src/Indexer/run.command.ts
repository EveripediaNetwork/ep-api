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

const SLEEP_TIME = 4000
const SLEEP_TIME_QUERY = 3000

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
    unixtime: number,
    loop?: boolean,
  ): Promise<void> {
    if (hashes.length === 0 && loop) {
      await new Promise(r => setTimeout(r, SLEEP_TIME_QUERY))
      const newHashes = await this.providerService.getIPFSHashesFromBlock(
        unixtime,
      )
      console.log(`🔁 Running Indexer on Loop, checking for new hashes! 🔁`)
      console.log(`❕ Found ${newHashes.length} hashes!`)
      // TODO: refactor all this (doing it from gh rn)
      const repo = this.connection.getRepository(Wiki)
      const lastWikiEdited = await repo.find({
        order: {
          updated: 'DESC',
        },
        take: 1,
      })
      const newUnixtime = Math.floor(
        new Date(lastWikiEdited[0].updated).getTime() / 1000,
      )
      await this.initiateIndexer(newHashes, newUnixtime, loop)
    }

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
      
    if (loop) {
      // TODO: refactor all this (doing it from gh rn)
      const repo2 = this.connection.getRepository(Wiki)
      const lastWikiEdited2 = await repo2.find({
        order: {
          updated: 'DESC',
        },
        take: 1,
      })
      const newUnixtime2 = Math.floor(
        new Date(lastWikiEdited2[0].updated).getTime() / 1000,
      )
      const newHashes = await this.providerService.getIPFSHashesFromBlock(newUnixtime2)
      await this.initiateIndexer(newHashes, newUnixtime2, loop)
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

    if (loop) await this.initiateIndexer(hashes, unixtime, loop)

    await this.initiateIndexer(hashes, unixtime)

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
