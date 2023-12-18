import { Command, CommandRunner, Option } from 'nest-commander'
import { DataSource } from 'typeorm'
import { Wiki as WikiType } from '@everipedia/iq-utils'
import GraphProviderService, { Hash } from './Provider/graph.service'
import IPFSGetterService from './IPFSGetter/ipfs-getter.service'
import IPFSValidatorService from './Validator/validator.service'
import DBStoreService from './Store/store.service'
import Wiki from '../Database/Entities/wiki.entity'
import MetadataChangesService from './Store/metadataChanges.service'
import { getWikiSummary } from '../App/utils/getWikiSummary'

interface CommandOptions {
  unixtime: number
  loop: boolean
  ipfsTime: boolean
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
    private dataSource: DataSource,
    private metaChanges: MetadataChangesService,
  ) {}

  async getUnixtime() {
    const repo = this.dataSource.getRepository(Wiki)
    const lastWikiEdited = await repo.find({
      order: {
        updated: 'DESC',
      },
      take: 1,
    })

    const unixtime =
      lastWikiEdited.length > 0
        ? Math.floor(new Date(lastWikiEdited[0].updated).getTime() / 1000)
        : Math.floor(new Date().getTime() / 1000) - 86400

    return unixtime
  }

  async initiateIndexer(
    hashes: Hash[],
    unixtime: number,
    loop?: boolean,
    useIpfsTime = false,
  ): Promise<void> {
    let newUnixtime

    if (hashes.length === 0 && loop) {
      await new Promise((r) => setTimeout(r, SLEEP_TIME_QUERY))
      const newHashes = await this.providerService.getIPFSHashesFromBlock(
        unixtime,
      )

      console.log('🔁 Running Indexer on Loop, checking for new hashes! 🔁')
      console.log(`❕ Found ${newHashes.length} hashes!`)

      newUnixtime = await this.getUnixtime()
      await this.initiateIndexer(newHashes, newUnixtime, loop)
    }

    for (const hash of hashes) {
      await this.saveToDB(hash, false, useIpfsTime)
    }

    if (loop) {
      newUnixtime = await this.getUnixtime()
      const newHashes = await this.providerService.getIPFSHashesFromBlock(
        newUnixtime,
      )
      await this.initiateIndexer(newHashes, newUnixtime, loop)
    }
  }

  async getDate(unix: number, jump: number, isoDate?: string) {
    if (isoDate) {
      const date = new Date(isoDate)
      date.setUTCHours(date.getUTCHours() - jump)
      const modifiedISO = date.toISOString().replace('Z', '')
      return modifiedISO
    }

    const milliseconds = unix * 1000
    const date = new Date(milliseconds)
    const minutes = date.getUTCMinutes()
    const seconds = date.getUTCSeconds()

    date.setUTCHours(date.getUTCHours() - jump)
    date.setUTCMinutes(minutes)
    date.setUTCSeconds(seconds)

    return date.toISOString()
  }

  async saveToDB(
    hash: Hash,
    webhook: boolean,
    reIndex: boolean,
  ): Promise<void> {
    try {
      const content = await this.ipfsGetter.getIPFSDataFromHash(hash.id)
      let wikiContent = content
      if (reIndex) {
        if (!content.created) {
          const hashDate = await this.getDate(hash.createdAt, 1)
          wikiContent = {
            ...content,
            created: hashDate,
            updated: hashDate,
          }
        }
        const update = await this.getDate(hash.createdAt, 1, content.updated)
        wikiContent = {
          ...content,
          updated: update,
        }
      }
      const computedMetadata = await this.metaChanges.appendMetadata(
        wikiContent,
      )
      const addedSummary = await getWikiSummary(computedMetadata)

      const completeWiki = {
        ...computedMetadata,
        summary: addedSummary,
      }

      const stat = await this.validator.validate(
        completeWiki,
        false,
        hash.userId,
      )
      if (stat.status) {
        console.log('✅ Validated Wiki content! IPFS going through...')
        if (!reIndex) {
          await this.dbStoreService.storeWiki(completeWiki as WikiType, hash)
        } else {
          await this.dbStoreService.storeWiki(
            completeWiki as WikiType,
            hash,
            true,
          )
        }

        console.log(`🚀 Storing IPFS: ${hash.id}`)
      } else {
        console.log(stat)
        console.error(`🔥 Invalid IPFS: ${hash.id}`)
      }
      if (!webhook) {
        await new Promise((r) => setTimeout(r, reIndex ? 300 : SLEEP_TIME))
      }
    } catch (ex) {
      console.error(`🛑 Invalid IPFS: ${hash.id}`)
      console.error(ex)
    }
  }

  async run(passedParam: string[], options?: CommandOptions): Promise<void> {
    let unixtime = 0
    const loop = options?.loop || false
    const useIpfs = options?.ipfsTime || false

    if (options?.unixtime === undefined) {
      unixtime = await this.getUnixtime()
    } else {
      unixtime = options.unixtime
    }

    const hashes = await this.providerService.getIPFSHashesFromBlock(
      unixtime,
      useIpfs && false,
    )

    if (loop) await this.initiateIndexer(hashes, unixtime, loop)

    await this.initiateIndexer(hashes, unixtime, loop, useIpfs)

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

  @Option({
    flags: '-it, --ipfsTime [boolean]',
    description: 'Uses IPFS time instead of db auto create/update time',
  })
  parseTimeBoolean(val: string): boolean {
    return JSON.parse(val)
  }
}

export default RunCommand
