/* eslint-disable @typescript-eslint/no-var-requires */
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import * as protobuf from 'protobufjs'
import { MarketCapSearchType } from '../marketCap/marketcap.dto'

const pm2 = require('pm2')

export enum Pm2Events {
  UPDATE_CACHE = 'updateCache',
  DELETE_CACHE = 'deleteCache',
  BLOG_REQUEST_DATA = 'blogRequestData',
  BLOG_SEND_DATA = 'blogSendData',
  STATS_REQUEST_DATA = 'statsRequestData',
  STATS_SEND_DATA = 'statsSendData',
  BUILD_RANK_SEARCH_DATA = 'buildSearchData',
}

@Injectable()
class Pm2Service {
  private readonly logger = new Logger(Pm2Service.name)
  private pm2Ids = new Map<number, string>()
  private protoRoot: protobuf.Root | null = null

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    this.initializeProtobuf()
  }

  private initializeProtobuf(): void {
    const proto = `
      syntax = "proto3";

      message ImageData {
        string id = 1;
        string type = 2;
      }

      message LinkedWikis {
        string id = 1;
        string title = 2;
        repeated ImageData images = 3;
      }

      message EventsData {
        string title = 1;
        string type = 2;
        string date = 3;
      }

      message TagData {
        string id = 1;
      }

      message RankPageData {
        string id = 1;
        string title = 2;
        repeated ImageData images = 3;
        string marketDataJson = 4;
        repeated TagData tags = 5;
        repeated LinkedWikis founderWikis = 6;
        repeated LinkedWikis blockchainWikis = 7;
        repeated EventsData events = 8;
      }

      message MarketCapSearchProto {
        repeated RankPageData nfts = 1;
        repeated RankPageData tokens = 2;
        repeated RankPageData aiTokens = 3;
        repeated RankPageData krwTokens = 4;
        repeated RankPageData memeTokens = 5;
        repeated RankPageData stableCoins = 6;
      }
    `

    this.protoRoot = protobuf.parse(proto).root
  }

  async onModuleInit(): Promise<void> {
    setTimeout(() => {
      pm2.connect(() => {
        pm2.list((_err: unknown, list: any) => {
          for (const pm2Info of list) {
            this.pm2Ids.set(pm2Info.pm_id, pm2Info.name)
          }
          pm2.disconnect(() => {})
        })
      })
    }, 10000)
  }

  async sendDataToProcesses(
    topic: string,
    data: any,
    ignoreId?: number | string,
    id?: number,
    processName = 'ep-api',
  ): Promise<number> {
    if (String(ignoreId) && ignoreId === 'all') {
      this.sendToProcess(0, topic, data)
      return 0
    }

    if (String(ignoreId) && ignoreId === 'one' && id) {
      this.sendToProcess(id, topic, data)
      return 0
    }

    for (const [processId, pName] of this.pm2Ids) {
      if (
        pName === processName &&
        ((ignoreId && processId !== ignoreId) || (processId !== 0 && !ignoreId))
      ) {
        this.sendToProcess(processId, topic, data)
      }
    }

    return 0
  }

  private sendToProcess(processId: number, topic: string, data: any): void {
    pm2.connect((err: unknown) => {
      if (err) {
        this.logger.error('Error connecting to PM2:', err)
        return
      }

      pm2.sendDataToProcessId(
        {
          id: processId,
          type: 'process:msg',
          topic,
          data,
        },
        (err: unknown) => {
          if (err) {
            this.logger.error(
              `TOPIC - { ${topic} } | Error sending data to process ${processId}:`,
              err,
            )
          } else {
            this.logger.log(
              `TOPIC - { ${topic} } | Data successfully sent to process ${processId}`,
            )
          }
        },
      )
    })
  }

  @OnEvent('updateCache')
  async setCacheData(payload: any): Promise<void> {
    const data = payload.data.isProtobuf
      ? this.deserializeFromProtobuf(Buffer.from(payload.data.data, 'base64'))
      : JSON.parse(payload.data.data)

    await this.cacheManager.set(payload.data.key, data, payload.data.ttl)
  }

  @OnEvent('deleteCache')
  async deleteCacheData(payload: any): Promise<void> {
    for (const key of payload.data.keys) {
      await this.cacheManager.del(key)
    }
  }

  public serializeToProtobuf(state: MarketCapSearchType): Buffer {
    if (!this.protoRoot) {
      throw new Error('Protobuf root not initialized')
    }

    const MarketCapSearchProto = this.protoRoot.lookupType(
      'MarketCapSearchProto',
    )
    const payload = {
      nfts: state.nfts.map((item) => this.convertToProtoMessage(item)),
      tokens: state.tokens.map((item) => this.convertToProtoMessage(item)),
      aiTokens: state.aiTokens.map((item) => this.convertToProtoMessage(item)),
      krwTokens: state.krwTokens.map((item) =>
        this.convertToProtoMessage(item),
      ),
      memeTokens: state.memeTokens.map((item) =>
        this.convertToProtoMessage(item),
      ),
      stableCoins: state.stableCoins.map((item) =>
        this.convertToProtoMessage(item),
      ),
    }

    const errMsg = MarketCapSearchProto.verify(payload)
    if (errMsg) throw Error(errMsg)

    const message = MarketCapSearchProto.create(payload)
    return Buffer.from(MarketCapSearchProto.encode(message).finish())
  }

  public deserializeFromProtobuf(buffer: Buffer): MarketCapSearchType {
    if (!this.protoRoot) {
      throw new Error('Protobuf root not initialized')
    }

    const MarketCapSearchProto = this.protoRoot.lookupType(
      'MarketCapSearchProto',
    )
    const message = MarketCapSearchProto.decode(buffer)
    const object = MarketCapSearchProto.toObject(message)

    return {
      nfts:
        object.nfts?.map((item: any) => this.convertFromProtoMessage(item)) ||
        [],
      tokens:
        object.tokens?.map((item: any) => this.convertFromProtoMessage(item)) ||
        [],
      aiTokens:
        object.aiTokens?.map((item: any) =>
          this.convertFromProtoMessage(item),
        ) || [],
      krwTokens:
        object.krwTokens?.map((item: any) =>
          this.convertFromProtoMessage(item),
        ) || [],
      memeTokens:
        object.memeTokens?.map((item: any) =>
          this.convertFromProtoMessage(item),
        ) || [],
      stableCoins:
        object.stableCoins?.map((item: any) =>
          this.convertFromProtoMessage(item),
        ) || [],
    }
  }

  public convertToProtoMessage(item: any): any {
    return {
      id: item.id || '',
      title: item.title || '',
      images: this.convertImages(item.images),
      marketDataJson: JSON.stringify(
        item.nftMarketData || item.tokenMarketData || {},
      ),
      tags: this.convertTags(item.tags),
      founderWikis: this.convertLinkedWikis(item.founderWikis),
      blockchainWikis: this.convertLinkedWikis(item.blockchainWikis),
      events: this.convertEvents(item.events),
    }
  }

  public convertFromProtoMessage(protoItem: any): any {
    const marketData = this.parseMarketData(protoItem.marketDataJson)

    const result: any = {
      id: protoItem.id || '',
      title: protoItem.title || '',
      images: this.reconstructImages(protoItem.images),
      founderWikis: this.reconstructLinkedWikis(protoItem.founderWikis),
      blockchainWikis: this.reconstructLinkedWikis(protoItem.blockchainWikis),
      events: this.reconstructEvents(protoItem.events),
      tags: this.reconstructTags(protoItem.tags),
    }

    if (marketData && typeof marketData === 'object') {
      if ('floor_price_eth' in marketData || 'floor_price_usd' in marketData) {
        result.nftMarketData = marketData
      } else if (
        'current_price' in marketData ||
        'market_cap_rank' in marketData
      ) {
        result.tokenMarketData = marketData
      }
    }

    return result
  }

  private convertImages(images: any[]): any[] {
    return Array.isArray(images)
      ? images.map((img: any) => ({
          id: img.id || '',
          type: img.type || '',
        }))
      : []
  }

  private reconstructImages(images: any[]): any[] {
    return Array.isArray(images)
      ? images.map((img: any) => ({
          id: img.id || '',
          type: img.type || '',
        }))
      : []
  }

  private convertLinkedWikis(wikis: any[]): any[] {
    return Array.isArray(wikis)
      ? wikis.map((wiki: any) => ({
          id: wiki.id || '',
          title: wiki.title || '',
          images: this.convertImages(wiki.images),
        }))
      : []
  }

  private reconstructLinkedWikis(wikis: any[]): any[] {
    return Array.isArray(wikis)
      ? wikis.map((wiki: any) => ({
          id: wiki.id || '',
          title: wiki.title || '',
          images: this.reconstructImages(wiki.images),
        }))
      : []
  }

  private convertEvents(events: any[]): any[] {
    return Array.isArray(events)
      ? events.map((event: any) => ({
          title: event.title || '',
          type: event.type || '',
          date: event.date || '',
        }))
      : []
  }

  private reconstructEvents(events: any[]): any[] {
    return Array.isArray(events)
      ? events.map((event: any) => ({
          title: event.title || '',
          type: event.type || '',
          date: event.date || '',
        }))
      : []
  }

  private convertTags(tags: any[]): any[] {
    return Array.isArray(tags)
      ? tags.map((tag: any) => ({ id: tag.id || '' }))
      : []
  }

  private reconstructTags(tags: any[]): any[] {
    return Array.isArray(tags)
      ? tags.map((tag: any) => ({ id: tag.id || '' }))
      : []
  }

  private extractMarketCap(item: any): string {
    const marketData = item.nftMarketData || item.tokenMarketData || {}
    return (
      item.marketCap ||
      (marketData.market_cap ? String(marketData.market_cap) : '')
    )
  }

  private parseMarketData(marketDataJson: string): any {
    try {
      return marketDataJson ? JSON.parse(marketDataJson) : {}
    } catch (e) {
      this.logger.warn('Failed to parse marketDataJson:', e)
      return {}
    }
  }
}

export default Pm2Service
