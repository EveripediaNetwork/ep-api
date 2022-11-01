/* eslint-disable import/no-cycle */
import { Injectable, UseInterceptors } from '@nestjs/common'
import { Connection } from 'typeorm'
import Wiki from '../../Database/Entities/wiki.entity'
import Language from '../../Database/Entities/language.entity'
import User from '../../Database/Entities/user.entity'
import Tag from '../../Database/Entities/tag.entity'
import Category from '../../Database/Entities/category.entity'
import { Hash } from '../Provider/graph.service'
import Activity, { Status } from '../../Database/Entities/activity.entity'
import { Source } from '../../Database/Entities/media.entity'
import SentryInterceptor from '../../sentry/security.interceptor'
import {
  RevalidatePageService,
  RevalidateEndpoints,
} from '../../App/revalidatePage/revalidatePage.service'

export type ValidWiki = {
  id: string
  version: number
  language: string
  title: string
  content: string
  summary?: string
  created?: Date
  updated?: Date
  tags: {
    id: string
  }[]
  metadata: {
    id: string
    value: string
  }[]
  categories: {
    id: string
    title: string
  }[]
  media: {
    id: string
    name: string
    size: string
    source: Source
  }[]
  images: {
    id: string
    type: string
  }[]
  user: {
    id: string
  }
  hidden: boolean
}

@UseInterceptors(SentryInterceptor)
@Injectable()
class DBStoreService {
  constructor(
    private connection: Connection,
    private revalidate: RevalidatePageService,
  ) {}

  async storeWiki(wiki: ValidWiki, hash: Hash): Promise<boolean> {
    const wikiRepository = this.connection.getRepository(Wiki)
    const languageRepository = this.connection.getRepository(Language)
    const userRepository = this.connection.getRepository(User)
    const tagRepository = this.connection.getRepository(Tag)
    const categoryRepository = this.connection.getRepository(Category)
    const activityRepository = this.connection.getRepository(Activity)

    let user = await userRepository.findOne(wiki.user.id)
    if (!user) {
      user = userRepository.create({
        id: wiki?.user.id,
      })
      user = await userRepository.save(user)
    }

    let language = await languageRepository.findOne(wiki.language)
    if (!language) {
      language = languageRepository.create({
        id: wiki.language,
      })
      language = await languageRepository.save(language)
    }
    const tags: Tag[] = []
    for (const tagJSON of wiki.tags) {
      let tag = await tagRepository.findOne(tagJSON.id)
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
      let category = await categoryRepository.findOne(categoryJSON.id)
      if (!category) {
        category = categoryRepository.create({
          id: categoryJSON.id,
        })
        category = await categoryRepository.save(category)
      }
      categories.push(category)
    }

    const existWiki = await wikiRepository.findOne(wiki.id)

    const createActivity = (typ: Status) => {
      const resp = activityRepository.create({
        wikiId: wiki.id,
        type: typ,
        user,
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
            created: existWiki?.created || new Date(Date.now()),
            updated: new Date(Date.now()),
            categories,
            images: wiki.images,
            media: wiki.media || [],
            metadata: wiki.metadata,
            transactionHash: hash.transactionHash,
            ipfs: hash.id,
          },
        ],
        block: hash.block,
        language,
        datetime: new Date(Date.now()),
        ipfs: hash.id,
      })
      return resp
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
      existWiki.images = wiki.images
      existWiki.media = wiki.media || []
      existWiki.metadata = wiki.metadata
      existWiki.block = hash.block
      existWiki.ipfs = hash.id
      existWiki.hidden = wiki.hidden
      existWiki.transactionHash = hash.transactionHash
      await wikiRepository.save(existWiki)
      await activityRepository.save(createActivity(Status.UPDATED))
      await this.revalidate.revalidatePage(
        RevalidateEndpoints.STORE_WIKI,
        existWiki.user.id,
        existWiki.id,
        existWiki.promoted,
      )
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
      media: wiki.media || [],
      categories,
      images: wiki.images,
      metadata: wiki.metadata,
      block: hash.block,
      ipfs: hash.id,
      transactionHash: hash.transactionHash,
    })

    await wikiRepository.save(newWiki)
    await activityRepository.save(createActivity(Status.CREATED))
    await this.revalidate.revalidatePage(
      RevalidateEndpoints.STORE_WIKI,
      newWiki.user.id,
      newWiki.id,
    )
    return true
  }
}

export default DBStoreService
