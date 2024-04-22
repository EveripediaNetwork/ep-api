import { Command, CommandRunner, Option } from 'nest-commander'
import { DataSource } from 'typeorm'
import { Wiki as WikiType } from '@everipedia/iq-utils'
import * as fs from 'fs/promises'
import GraphProviderService, {
  Hash,
  hashesFilePath,
} from './Provider/graph.service'
import IPFSGetterService from './IPFSGetter/ipfs-getter.service'
import IPFSValidatorService from './Validator/validator.service'
import DBStoreService from './Store/store.service'
import Wiki from '../Database/Entities/wiki.entity'
import MetadataChangesService from './Store/metadataChanges.service'
import { getWikiSummary } from '../App/utils/getWikiSummary'
import AutoInjestService from '../App/utils/auto-injest'
import {
  TWENTY_FOUR_HOURS_AGO,
  SLEEP_TIME_QUERY,
  SLEEP_TIME,
  CommandOptions,
} from './indexerUtils'
import RPCProviderService from './RPCProvider/RPCProvider.service'

@Command({ name: 'indexer', description: 'A blockchain indexer' })
class RunCommand implements CommandRunner {
  constructor(
    private providerService: GraphProviderService,
    private rpcProviderService: RPCProviderService,
    private ipfsGetter: IPFSGetterService,
    private validator: IPFSValidatorService,
    private dbStoreService: DBStoreService,
    private dataSource: DataSource,
    private metaChanges: MetadataChangesService,
    private iqInjest: AutoInjestService,
  ) {}

  async getMostRecentWiki(): Promise<Wiki[]> {
    const repo = this.dataSource.getRepository(Wiki)
    return repo.find({
      order: {
        updated: 'DESC',
      },
      take: 1,
    })
  }

  async getUnixtime() {
    const lastWikiEdited = await this.getMostRecentWiki()
    const unixtime =
      lastWikiEdited.length > 0
        ? Math.floor(new Date(lastWikiEdited[0].updated).getTime() / 1000)
        : TWENTY_FOUR_HOURS_AGO

    return unixtime
  }

  async initiateIndexer(
    hashes: Hash[],
    unixtime: number,
    mode: string,
    loop?: boolean,
    useIpfsTime = false,
  ): Promise<void> {
    let newUnixtime

    if (hashes.length === 0 && loop) {
      await new Promise(r => setTimeout(r, SLEEP_TIME_QUERY))

      const newHashes = await this.getHashes(mode, unixtime)
      console.log(
        `${mode} mode: 🔁 Running Indexer on Loop, checking for new hashes! 🔁`,
      )
      console.log(`❕ Found ${newHashes.length} hashes!`)

      newUnixtime = await this.getUnixtime()
      await this.initiateIndexer(newHashes, newUnixtime, mode, loop)
    }
    const lastHash = hashes[hashes.length - 1]
    for (const hash of hashes) {
      await this.saveToDB(hash, false, useIpfsTime, mode)
      if (useIpfsTime && hash.transactionHash === lastHash.transactionHash) {
        await fs.unlink(hashesFilePath)
      }
    }

    if (loop) {
      newUnixtime = await this.getUnixtime()
      const newHashes = await this.getHashes(mode, unixtime)
      await this.initiateIndexer(newHashes, newUnixtime, mode, loop)
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
    mode: string
  ): Promise<void> {
    try {
      const content = await this.ipfsGetter.getIPFSDataFromHash(hash.id)
      let wikiContent = content
      if (reIndex) {
        console.log('REINDEX CHECK CONTENT')
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
        console.log(
          `${mode} mode: ✅ Validated Wiki content! IPFS going through...`,
        )
        if (!reIndex) {
          await this.dbStoreService.storeWiki(completeWiki as WikiType, hash)
          await this.iqInjest.initiateInjest()
        } else {
          await this.dbStoreService.storeWiki(
            completeWiki as WikiType,
            hash,
            true,
          )
        }

        console.log(`${mode} mode: 🚀 Storing IPFS: ${hash.id}`)
      } else {
        console.log(stat)
        console.error(`${mode} mode: 🔥 Invalid IPFS: ${hash.id}`)
      }
      if (!webhook) {
        await new Promise(r => setTimeout(r, reIndex ? 300 : SLEEP_TIME))
      }
    } catch (ex) {
      console.error(`${mode} mode: 🛑 Invalid IPFS: ${hash.id}`)
      console.error(ex)
    }
  }

  async getHashes(
    mode: string,
    unixtime: number,
    useIpfs?: boolean,
  ): Promise<Hash[] | []> {
    console.log(1)
    let hashes = []
    if (mode === 'RPC') {
      const wiki = await this.getMostRecentWiki()
      const { block } = wiki[0]
      hashes = await this.rpcProviderService.getHashesFromLogs(block)
    } else {
      hashes = await this.providerService.getIPFSHashesFromBlock(
        unixtime,
        useIpfs,
      )
    }
    return hashes
  }

  async run(passedParam: string[], options?: CommandOptions): Promise<void> {
    console.log(2)
    let unixtime = 0
    const loop = options?.loop || false
    const useIpfs = options?.ipfsTime || false
    const mode = options?.mode || 'SUBGRAPH'

    if (options?.unixtime === undefined) {
      unixtime = await this.getUnixtime()
    } else {
      unixtime = options.unixtime
    }

    const hashes = await this.getHashes(mode, unixtime, useIpfs)

    if (loop) await this.initiateIndexer(hashes, unixtime, mode, loop)

    await this.initiateIndexer(hashes, unixtime, mode, loop, useIpfs)

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

  @Option({
    flags: '-m, --mode [string]',
    description: 'Set to subgraph calls or rpc mode',
  })
  parseMode(val: string): string {
    console.log(val)
    return String(val).toUpperCase()
  }
}

export default RunCommand
