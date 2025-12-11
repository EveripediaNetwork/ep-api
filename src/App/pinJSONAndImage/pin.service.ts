import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import {
  EventAction,
  ValidatorCodes,
  Wiki as WikiType,
} from '@everipedia/iq-utils'
import { DataSource, In } from 'typeorm'
import IpfsHash from './model/ipfsHash'
import IPFSValidatorService from '../../Indexer/Validator/validator.service'
import { USER_ACTIVITY_LIMIT, SOPHIA_ID } from '../../globalVars'
import MetadataChangesService from '../../Indexer/Store/metadataChanges.service'
import WebhookHandler from '../utils/discordWebhookHandler'
import { ActionTypes, WebhookPayload } from '../utils/utilTypes'
import SecurityTestingService from '../utils/securityTester'
import ActivityRepository from '../Activities/activity.repository'
import PinataService from '../../ExternalServices/pinata.service'
import MarketCapIds from '../../Database/Entities/marketCapIds.entity'
import { RankType } from '../marketCap/marketcap.dto'
import Wiki from '../../Database/Entities/wiki.entity'
import Events from '../../Database/Entities/Event.entity'
import RecentActivity from '../../Database/Entities/recentActivity.entity'
import GatewayService from '../utils/gatewayService'

interface CgApiIdList {
  id: string
  symbol: string
  name: string
}

const contentCheckDate = 1699269216 // 6/11/23
@Injectable()
class PinService {
  private readonly logger = new Logger(PinService.name)

  constructor(
    private dataSource: DataSource,
    private gateway: GatewayService,
    private pinateService: PinataService,
    private validator: IPFSValidatorService,
    private testSecurity: SecurityTestingService,
    private activityRepository: ActivityRepository,
    private metadataChanges: MetadataChangesService,
    private readonly pinJSONErrorWebhook: WebhookHandler,
  ) {}

  async pinImage(file: fs.PathLike): Promise<IpfsHash | any> {
    const readableStreamForFile = fs.createReadStream(file)

    const options = {
      pinataMetadata: {
        name: 'wiki-image',
      },
    }

    const pinImageToPinata = async (
      data: typeof readableStreamForFile,
      option: typeof options,
    ) => this.pinateService.getPinataInstance().pinFileToIPFS(data, option)

    try {
      const res = await pinImageToPinata(readableStreamForFile, options)
      return res
    } catch (e) {
      return e
    }
  }

  async pinJSON(body: string): Promise<IpfsHash | any> {
    const wiki: WikiType = JSON.parse(body)

    const { wikiObject, saveMatchedIdcallback } =
      await this.handleCoingekoApiId(wiki)

    const wikiData = await this.metadataChanges.removeEditMetadata(wikiObject)

    const isDataValid = await this.validator.validate(wikiData, true)

    let isContentSecure

    const wikiDate = wikiObject.created
      ? Math.floor(new Date(wikiObject.created).getTime() / 1000)
      : null

    if (!wikiObject.created) {
      isContentSecure = await this.testSecurity.checkContent(wikiData)
    }

    if (!isDataValid.status || (isContentSecure && !isContentSecure.status)) {
      const errorMessage = !isDataValid.status
        ? isDataValid.message
        : isContentSecure?.message

      this.pinJSONErrorWebhook.postWebhook(ActionTypes.PINJSON_ERROR, {
        title: errorMessage,
        description: isContentSecure?.match,
        content: (!isContentSecure?.status || !isDataValid.status) && wikiData,
      } as unknown as WebhookPayload)
      if (wikiDate && wikiDate > contentCheckDate) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: errorMessage,
          },
          HttpStatus.BAD_REQUEST,
        )
      }
    }

    const activityResult = await this.activityRepository.countUserActivity(
      wikiData.user.id,
      72,
    )

    if (activityResult > USER_ACTIVITY_LIMIT) {
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: ValidatorCodes.GLOBAL_RATE_LIMIT,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    if (
      wikiData.user.id.toLowerCase() === SOPHIA_ID.toLowerCase() &&
      !(wikiData as any).operator
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Operator field is required for Sophia Edits',
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (
      (wikiData as any).operator &&
      (wikiData as any).operator.id?.toLowerCase() === SOPHIA_ID.toLowerCase()
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Operator cannot be Sophia',
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const { createdEvents, updatedEvents, deletedEvents } =
      await this.updateEventsTable(wikiData as unknown as Wiki)
    const recentActivity = (wikiData as any).recentActivity
    const recentActivityState = await this.trackRecentActivity(
      recentActivity,
      wikiData.id,
    )

    if (createdEvents.length !== 0) {
      wikiData.events?.map((obj) => {
        if (obj.action === EventAction.CREATE) {
          const { id, action, ...rest } = obj
          const matchingObj = this.findMatchingObject(createdEvents, {
            ...rest,
          })
          if (matchingObj) {
            return { ...rest, id: matchingObj.id }
          }
        }
        return obj
      })
    }

    wikiData.events = wikiData.events
      ?.filter(({ action }) => action !== EventAction.DELETE)
      .map(({ action, ...rest }) => rest)

    const payload = {
      pinataMetadata: {
        name: wikiData.content !== undefined ? wikiData.title : 'image',
      },
      pinataContent: {
        ...wikiData,
      },
    }
    const pinToPinata = async (wikiContent: typeof payload) =>
      this.pinateService.getPinataInstance().pinJSONToIPFS(wikiContent)

    try {
      const res = await pinToPinata(payload)
      await saveMatchedIdcallback()
      return res
    } catch (e) {
      await this.revertEventChanges(createdEvents, updatedEvents, deletedEvents)
      await this.revertRecentActivityChanges(
        wikiData.id,
        recentActivityState.previousActivity,
        recentActivityState.wasInserted,
      )
      return e
    }
  }

  findMatchingObject(objects: any, objectWithoutId: any) {
    return objects.find((obj: { [x: string]: any }) => {
      for (const key in objectWithoutId) {
        if (obj[key] !== objectWithoutId[key]) {
          return false
        }
      }
      return true
    })
  }

  async trackRecentActivity(
    recentActivity: string | undefined,
    wikiId: string,
  ): Promise<{ previousActivity: string | null; wasInserted: boolean }> {
    if (!recentActivity) return { previousActivity: null, wasInserted: false }

    const repository = this.dataSource.getRepository(RecentActivity)

    try {
      const existingRecord = await repository.findOne({
        where: { wikiId },
      })

      const previousActivity = existingRecord?.recentActivity || null
      const wasInserted = !existingRecord

      if (existingRecord) {
        existingRecord.recentActivity = recentActivity
        await repository.save(existingRecord)
      } else {
        const newRecord = repository.create({
          wikiId,
          recentActivity,
        })
        await repository.save(newRecord)
      }

      return { previousActivity, wasInserted }
    } catch (error) {
      this.logger.error(
        'Error tracking recent activity for wiki:',
        wikiId,
        error,
      )
      return { previousActivity: null, wasInserted: false }
    }
  }

  async updateEventsTable(wiki: Wiki): Promise<{
    createdEvents: Events[]
    updatedEvents: Events[]
    deletedEvents: Events[]
  }> {
    const repository = this.dataSource.getRepository(Events)

    if (!wiki.events || wiki.events.length === 0) {
      this.logger.debug('No events to process for wiki:', wiki.id)
      return { createdEvents: [], updatedEvents: [], deletedEvents: [] }
    }

    this.logger.debug(
      `Processing ${wiki.events.length} events for wiki: ${wiki.id}`,
    )

    let createEvents = wiki.events.filter(
      (event) => event.action === EventAction.CREATE,
    )
    const updateEvents = wiki.events.filter(
      (event) => event.action === EventAction.EDIT,
    )
    const deleteEvents = wiki.events.filter(
      (event) => event.action === EventAction.DELETE,
    )

    this.logger.debug(
      `Event breakdown - Create: ${createEvents.length}, Update: ${updateEvents.length}, Delete: ${deleteEvents.length}`,
    )

    createEvents = createEvents.map((e) => {
      if (e?.date?.length === 7) {
        return {
          ...e,
          wikiId: wiki.id,
          date: `${e.date}-01`,
        }
      }
      return {
        ...e,
        wikiId: wiki.id,
      }
    })

    let createdEvents: Events[] = []
    const updatedEvents: Events[] = []
    const deletedEvents: Events[] = []

    if (createEvents.length > 0) {
      const eventsToBeCreated = createEvents.map(({ action, id, ...rest }) => ({
        ...rest,
      }))
      const newEvents: Events[] = []
      for (const e of eventsToBeCreated) {
        const newEvent = repository.create(e)
        const savedEvent = await repository.save(newEvent)
        newEvents.push(savedEvent as Events)
      }
      createdEvents = newEvents
    }
    if (updateEvents.length > 0) {
      const eventsToBeUpdated = updateEvents.map(({ action, ...rest }) => ({
        ...rest,
      }))

      const existingEventIds = eventsToBeUpdated.map((event) => event.id)
      const existingEvents = await repository.findBy({
        id: In(existingEventIds),
      })

      for (const existingEvent of existingEvents) {
        const eventToUpdate = eventsToBeUpdated.find(
          (e: { id: string }) => e.id === existingEvent.id,
        )
        if (
          eventToUpdate &&
          existingEvent &&
          !this.findMatchingObject([existingEvent], eventToUpdate)
        ) {
          await repository.update({ id: existingEvent.id }, eventToUpdate)
          updatedEvents.push(existingEvent)
        }
      }
    }
    if (deleteEvents.length !== 0) {
      const eventsToBeDeleted = deleteEvents.map(({ action, ...rest }) => ({
        ...rest,
      }))

      // Validate that all events have valid IDs
      const validDeleteEvents = eventsToBeDeleted.filter(
        (event) =>
          event.id &&
          typeof event.id === 'string' &&
          event.id.trim().length > 0,
      )

      if (validDeleteEvents.length === 0) {
        this.logger.warn('No valid event IDs found for deletion')
      } else {
        try {
          const idValues = validDeleteEvents.map((obj) => obj.id)
          this.logger.debug(
            `Attempting to delete ${
              idValues.length
            } events with IDs: ${idValues.join(', ')}`,
          )

          const deleteResult = await repository.delete({ id: In(idValues) })

          this.logger.log(
            `Successfully deleted ${
              deleteResult.affected || 0
            } events from database`,
          )
          deletedEvents.push(...validDeleteEvents)

          // Log any events that couldn't be deleted
          if ((deleteResult.affected || 0) < validDeleteEvents.length) {
            this.logger.warn(
              `Expected to delete ${
                validDeleteEvents.length
              } events but only deleted ${deleteResult.affected || 0}`,
            )
          }
        } catch (error) {
          this.logger.error('Failed to delete events from database:', error)
          throw new HttpException(
            {
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              error: 'Failed to delete events',
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
          )
        }
      }

      // Log invalid events that were skipped
      const invalidEvents = eventsToBeDeleted.filter(
        (event) =>
          !event.id ||
          typeof event.id !== 'string' ||
          event.id.trim().length === 0,
      )
      if (invalidEvents.length > 0) {
        this.logger.warn(
          `Skipped ${invalidEvents.length} events with invalid IDs for deletion`,
        )
      }
    }
    return { createdEvents, updatedEvents, deletedEvents }
  }

  async revertEventChanges(
    createdIds: { id: string }[],
    updatedEvents: Events[],
    deletedEvents: Events[],
  ): Promise<void> {
    const repository = this.dataSource.getRepository(Events)

    try {
      // Revert created events (delete them)
      if (createdIds.length > 0) {
        const validCreatedIds = createdIds.filter(
          (obj) =>
            obj.id && typeof obj.id === 'string' && obj.id.trim().length > 0,
        )

        if (validCreatedIds.length > 0) {
          const idValues = validCreatedIds.map((obj) => obj.id)
          this.logger.debug(`Reverting ${idValues.length} created events`)
          await repository.delete({ id: In(idValues) })
        }
      }

      // Revert updated events (restore original values)
      if (updatedEvents.length > 0) {
        this.logger.debug(`Reverting ${updatedEvents.length} updated events`)
        for (const event of updatedEvents) {
          await repository.update({ id: event.id }, event)
        }
      }

      // Revert deleted events (recreate them)
      if (deletedEvents.length > 0) {
        const validDeletedEvents = deletedEvents.filter(
          (event) =>
            event.id &&
            typeof event.id === 'string' &&
            event.id.trim().length > 0,
        )

        if (validDeletedEvents.length > 0) {
          this.logger.debug(
            `Reverting ${validDeletedEvents.length} deleted events (recreating them)`,
          )
          await repository
            .createQueryBuilder()
            .insert()
            .into(Events)
            .values(
              validDeletedEvents.map(({ id, ...eventWithoutId }) => ({
                id,
                ...eventWithoutId,
              })),
            )
            .execute()
        }
      }

      this.logger.log('Successfully reverted all event changes')
    } catch (error) {
      this.logger.error('Failed to revert event changes:', error)
      // Don't throw here as this is already in an error recovery scenario
    }
  }

  async revertRecentActivityChanges(
    wikiId: string,
    previousActivity: string | null,
    wasInserted: boolean,
  ): Promise<void> {
    const repository = this.dataSource.getRepository(RecentActivity)

    try {
      if (wasInserted) {
        this.logger.debug(
          `Reverting recent activity for wiki ${wikiId} (deleting new record)`,
        )
        await repository.delete({ wikiId })
      } else if (previousActivity !== null) {
        this.logger.debug(
          `Reverting recent activity for wiki ${wikiId} (restoring previous value)`,
        )
        await repository.update(
          { wikiId },
          { recentActivity: previousActivity },
        )
      }

      this.logger.log('Successfully reverted recent activity changes')
    } catch (error) {
      this.logger.error('Failed to revert recent activity changes:', error)
    }
  }

  async handleCoingekoApiId(wiki: WikiType): Promise<{
    wikiObject: WikiType
    saveMatchedIdcallback: () => Promise<void | MarketCapIds>
  }> {
    const coingeckoProfileMetadata = wiki.metadata.find(
      (e) => e.id === 'coingecko_profile',
    )

    if (!coingeckoProfileMetadata) {
      return { wikiObject: wiki, saveMatchedIdcallback: async () => {} }
    }

    const coingeckoUrl = coingeckoProfileMetadata.value as string

    const marketCapIdRepo = this.dataSource.getRepository(MarketCapIds)
    const marketCapId = await marketCapIdRepo.findOneBy({ wikiId: wiki.id })

    if (!marketCapId || !marketCapId.linked) {
      const apiId = await this.getCgApiId(coingeckoUrl)
      const coingeckoApiId = await marketCapIdRepo.findOneBy({
        wikiId: wiki.id,
      })

      if (!apiId || coingeckoApiId) {
        return { wikiObject: wiki, saveMatchedIdcallback: async () => {} }
      }

      const index = wiki.metadata.findIndex(
        (item) => item.id === 'coingecko_profile',
      )

      if (index !== -1) {
        const newWiki = { ...wiki }
        newWiki.metadata[index].value =
          `https://www.coingecko.com/en/coins/${apiId}`
        this.logger.debug('wiki id', wiki.id, '🔗', 'coingecko api Id', apiId)
        const saveMatchedIdcallback = async () => {
          await marketCapIdRepo.upsert(
            {
              wikiId: wiki.id,
              coingeckoId: apiId,
              kind: RankType.TOKEN,
              linked: false,
            },
            {
              conflictPaths: ['wikiId', 'coingeckoId'],
              skipUpdateIfNoValuesChanged: true,
            },
          )
        }

        return {
          wikiObject: newWiki,
          saveMatchedIdcallback,
        }
      }
    }

    return { wikiObject: wiki, saveMatchedIdcallback: async () => {} }
  }

  async getCgApiId(url: string): Promise<string> {
    let apiId
    try {
      const data = await this.gateway.fetchData<CgApiIdList[]>(
        'https://pro-api.coingecko.com/api/v3/coins/list?include_platform=false',
        24 * 60 * 60,
      )
      const coinsList: CgApiIdList[] = data
      const urlSplit = url.split('/')
      const slugId = urlSplit[5]
      for (const coin of coinsList) {
        if (
          (!slugId.includes('-') &&
            coin.name.toLowerCase() === slugId.toLowerCase()) ||
          coin.name.split(' ').join('-').toLowerCase() ===
            slugId.toLowerCase() ||
          slugId === coin.id
        ) {
          apiId = coin.id
          break
        }
      }
    } catch (error) {
      this.logger.error('Error fetching coingecko api id for wiki')
    }
    return apiId as string
  }
}

export default PinService
