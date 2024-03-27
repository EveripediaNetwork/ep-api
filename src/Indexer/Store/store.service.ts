import { Injectable } from '@nestjs/common'
import { DataSource, ILike, Repository } from 'typeorm'
import { Wiki as WikiType } from '@everipedia/iq-utils'
import Wiki from '../../Database/Entities/wiki.entity'
import Language from '../../Database/Entities/language.entity'
import User from '../../Database/Entities/user.entity'
import Tag from '../../Database/Entities/tag.entity'
import Category from '../../Database/Entities/category.entity'
import { Hash } from '../Provider/graph.service'
import Activity, { Status } from '../../Database/Entities/activity.entity'
import {
  RevalidateEndpoints,
  RevalidatePageService,
} from '../../App/revalidatePage/revalidatePage.service'
import IqSubscription from '../../Database/Entities/IqSubscription'
import Notification from '../../Database/Entities/notification.entity'

@Injectable()
class DBStoreService {
  constructor(
    private dataSource: DataSource,
    private revalidate: RevalidatePageService,
  ) {}

  async existIPFS(newHash: string, oldHash?: string): Promise<boolean> {
    const activityRepository = this.dataSource.getRepository(Activity)
    const existActivity = await activityRepository.findOneBy({
      ipfs: newHash,
    })
    return oldHash === newHash && existActivity !== null
  }

  async storeWiki(
    wiki: WikiType,
    hash: Hash,
    ipfsTime?: boolean,
  ): Promise<boolean> {
    const wikiRepository = this.dataSource.getRepository(Wiki)
    const languageRepository = this.dataSource.getRepository(Language)
    const userRepository = this.dataSource.getRepository(User)
    const tagRepository = this.dataSource.getRepository(Tag)
    const categoryRepository = this.dataSource.getRepository(Category)
    const activityRepository = this.dataSource.getRepository(Activity)
    const iqSubscriptionRepository =
      this.dataSource.getRepository(IqSubscription)
    const notificationRepository = this.dataSource.getRepository(Notification)

    const oldWiki = await wikiRepository.findOneBy({
      id: wiki.id,
    })
    let user = await userRepository.findOneBy({ id: ILike(wiki.user.id) })
    const author = await userRepository.findOneBy({
      id: ILike(
        oldWiki ? (wiki.author.id as string) : (wiki.user.id as string),
      ),
    })

    if (!user) {
      user = userRepository.create({
        id: wiki?.user.id,
      })
      user = await userRepository.save(user)
    }

    let language = await languageRepository.findOneBy({
      id: wiki.language,
    })
    if (!language) {
      language = languageRepository.create({
        id: wiki.language,
      })
      language = await languageRepository.save(language)
    }
    const tags: Tag[] = []
    for (const tagJSON of wiki.tags) {
      let tag = await tagRepository.findOneBy({ id: tagJSON.id })
      if (!tag) {
        tag = tagRepository.create({
          id: tagJSON.id,
        })
        tag = await tagRepository.save(tag)
      }
      tags.push(tag)
    }

    const categories: Category[] = []
    for (const categoryJSON of wiki.categories) {
      let category = await categoryRepository.findOneBy({
        id: categoryJSON.id,
      })
      if (!category) {
        category = categoryRepository.create({
          id: categoryJSON.id,
        })
        category = await categoryRepository.save(category)
      }
      categories.push(category)
    }

    const existWiki = await wikiRepository.findOneBy({ id: wiki.id })

    const existSub = await iqSubscriptionRepository.findOneBy({
      auxiliaryId: wiki.id,
    })
    const newDate = new Date(Date.now())
    const incomingActivity = {
      wikiId: wiki.id,
      user,
      a_tags: tags,
      a_categories: categories,
      a_metadata: wiki.metadata,
      a_images: wiki.images,
      a_media: wiki.media || [],
      a_transactionHash: hash.transactionHash,
      a_block: hash.block,
      a_ipfs: hash.id,
      a_summary: wiki.summary,
      a_title: wiki.title,
      a_content: wiki.content,
      a_created: (ipfsTime && wiki.created) || existWiki?.created || newDate,
      a_updated: (ipfsTime && wiki.updated) || newDate,
      a_author: author,
      a_version: wiki.version,
      content: [
        {
          id: wiki.id,
          title: wiki.title,
          block: hash.block,
          content: wiki.content,
          summary: wiki.summary,
          version: wiki.version,
          language,
          user,
          tags,
          author,
          created: (ipfsTime && wiki.created) || existWiki?.created || newDate,
          updated: (ipfsTime && wiki.updated) || newDate,
          categories,
          images: wiki.images,
          media: wiki.media || [],
          metadata: wiki.metadata,
          transactionHash: hash.transactionHash,
          ipfs: hash.id,
        },
      ],
      userAddress: user.id,
      created_timestamp:
        (ipfsTime && wiki.created) || existWiki?.created || newDate,
      updated_timestamp:
        (ipfsTime && (wiki.updated as unknown as Date)) ||
        existWiki?.updated ||
        newDate,
      block: hash.block,
      language,
      datetime: (ipfsTime && (wiki.created as unknown as Date)) || newDate,
      ipfs: hash.id,
    }
    const existIpfs = await this.existIPFS(hash.id, existWiki?.ipfs)
    if (existIpfs) {
      console.debug('--- D U P L I C A T E   H A S H', hash.id, existWiki?.ipfs)
      return true
    }
    const createActivity = (
      repo: Repository<Activity>,
      data: Partial<Activity>,
    ) => repo.create(data)

    if (existWiki && existWiki.content !== wiki.content && existSub) {
      await notificationRepository
        .createQueryBuilder()
        .insert()
        .into(Notification)
        .values({ auxId: wiki.id, pending: true })
        .execute()
    }

    // TODO: store history and delete?
    if (existWiki) {
      existWiki.version = wiki.version
      existWiki.language = language
      existWiki.title = wiki.title
      existWiki.content = wiki.content
      existWiki.summary = wiki.summary || ''
      existWiki.user = user
      existWiki.tags = tags
      existWiki.categories = categories
      existWiki.images = wiki.images || []
      existWiki.media = wiki.media || []
      existWiki.linkedWikis = wiki.linkedWikis
      existWiki.events = wiki.events
      existWiki.metadata = wiki.metadata
      existWiki.block = hash.block
      existWiki.ipfs = hash.id
      existWiki.hidden = wiki.hidden
      existWiki.updated = ipfsTime
        ? (wiki.updated as unknown as Date)
        : existWiki.updated
      existWiki.transactionHash = hash.transactionHash
      await wikiRepository.save(existWiki)
      await activityRepository.save(
        createActivity(activityRepository, {
          ...incomingActivity,
          type: Status.UPDATED,
        } as unknown as Activity),
      )
      if (!ipfsTime) {
        await this.revalidate.revalidatePage(
          RevalidateEndpoints.STORE_WIKI,
          existWiki.user.id,
          existWiki.id,
          existWiki.promoted,
        )
      }

      return true
    }

    const newWiki = wikiRepository.create({
      id: wiki.id,
      version: wiki.version,
      language,
      title: wiki.title,
      content: wiki.content,
      summary: wiki.summary,
      user,
      tags,
      author: user,
      media: wiki.media || [],
      linkedWikis: wiki.linkedWikis,
      events: wiki.events,
      categories,
      images: wiki.images,
      metadata: wiki.metadata,
      block: hash.block,
      ipfs: hash.id,
      ...(ipfsTime && { created: wiki.created, updated: wiki.updated }),
      transactionHash: hash.transactionHash,
    })

    await wikiRepository.save(newWiki)
    await activityRepository.save(
      createActivity(activityRepository, {
        ...incomingActivity,
        type: Status.CREATED,
      } as unknown as Activity),
    )
    if (!ipfsTime) {
      await this.revalidate.revalidatePage(
        RevalidateEndpoints.STORE_WIKI,
        newWiki.user.id,
        newWiki.id,
      )
    }
    return true
  }
}

export default DBStoreService
