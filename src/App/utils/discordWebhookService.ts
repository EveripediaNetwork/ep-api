import { Inject, Injectable } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Cache } from 'cache-manager'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'
import { ActionTypes } from './utilTypes'
import WebhookHandler from './discordWebhookHandler'
import CacheTTL from '../../config/cache.config'

const addressToWikiCacheKey = 'address_to_wiki_cache'

interface AddressToWikiCache {
  knownAddresses: Record<string, number>
  unknownAddresses: string[]
}

@Injectable()
class DiscordWebhookService {
  constructor(
    private webhookHandler: WebhookHandler,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  async addressToWikiRequestLogs() {
    if (firstLevelNodeProcess()) {
      const cachedData = await this.cacheManager.get<AddressToWikiCache>(
        addressToWikiCacheKey,
      )
      if (!cachedData) {
        return
      }
      await this.webhookHandler.postWebhook(ActionTypes.WIKI_ETH_ADDRESS, {
        ...cachedData,
      })
    }
  }

  async updateAddressToWikiCache(addressData: any): Promise<void> {
    let cachedData = await this.cacheManager.get<AddressToWikiCache>(
      addressToWikiCacheKey,
    )

    if (!cachedData) {
      cachedData = {
        knownAddresses: {},
        unknownAddresses: [],
      }

      await this.cacheManager.set(
        addressToWikiCacheKey,
        cachedData,
        CacheTTL.TWO_HOURS,
      )
    }

    cachedData.knownAddresses = cachedData.knownAddresses || {}
    cachedData.unknownAddresses = cachedData.unknownAddresses || []

    if (!addressData.token) {
      if (!cachedData.unknownAddresses.includes(addressData.hash)) {
        cachedData.unknownAddresses.push(addressData.hash)
      }
    } else {
      cachedData.knownAddresses[addressData.token.name] =
        (cachedData.knownAddresses[addressData.token.name] || 0) + 1
    }

    await this.cacheManager.set(addressToWikiCacheKey, cachedData)
  }
}

export default DiscordWebhookService
