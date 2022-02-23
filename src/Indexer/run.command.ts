import { Command, CommandRunner, Option } from 'nest-commander'
import GraphProviderService from './Provider/graph.service'
import IPFSGetterService from './IPFSGetter/ipfs-getter.service'
import IPFSValidatorService from './Validator/validator.service'
import DBStoreService, { ValidWiki } from './Store/store.service'

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
  ) {}

  async run(passedParam: string[], options?: CommandOptions): Promise<void> {
    if (options?.unixtime === undefined) {
      console.error('No unixtime')
      process.exit(-1)
    }
    const hashes = await this.providerService.getIPFSHashesFromBlock(
      options.unixtime,
    )
    for (const hash of hashes) {
      try {
        const content = await this.ipfsGetter.getIPFSDataFromHash(hash.id)
        if (this.validator.validate(content)) {
          await this.dbStoreService.storeWiki(content as ValidWiki)
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
