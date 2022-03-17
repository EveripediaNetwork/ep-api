/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import Wiki from '../../Database/Entities/wiki.entity'
import Language from '../../Database/Entities/language.entity'
import User from '../../Database/Entities/user.entity'
import Tag from '../../Database/Entities/tag.entity'
import Category from '../../Database/Entities/category.entity'
import { Hash } from '../Provider/graph.service'

export type ValidWiki = {
  id: string
  version: number
  language: string
  content: {
    title: string
    content: string
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
    images: {
      id: string
      type: string
    }[]
    user: {
      id: string
    }
  }
}

@Injectable()
class DBStoreService {
  constructor(private connection: Connection) {}

  async storeWiki(wiki: ValidWiki, hash: Hash): Promise<boolean> {
    console.log(wiki)
    const wikiRepository = this.connection.getRepository(Wiki)
    const languageRepository = this.connection.getRepository(Language)
    const userRepository = this.connection.getRepository(User)
    const tagRepository = this.connection.getRepository(Tag)
    const categoryRepository = this.connection.getRepository(Category)

    let user = await userRepository.findOne(wiki.content.user.id)
    if (!user) {
      user = await userRepository.create({
        id: wiki.content.user.id,
      })
      user = await userRepository.save(user)
    }

    let language = await languageRepository.findOne(wiki.language)
    if (!language) {
      language = await languageRepository.create({
        id: wiki.language,
      })
      language = await languageRepository.save(language)
    }
    const tags = []
    for (const tagJSON of wiki.content.tags) {
      let tag = await tagRepository.findOne(tagJSON.id)
      if (!tag) {
        tag = await tagRepository.create({
          id: tagJSON.id,
        })
        tag = await tagRepository.save(tag)
      }
      tags.push(tag)
    }

    const categories = []
    for (const categoryJSON of wiki.content.categories) {
      let category = await categoryRepository.findOne(categoryJSON.id)
      if (!category) {
        category = await categoryRepository.create({
          id: categoryJSON.id,
        })
        category = await categoryRepository.save(category)
      }
      categories.push(category)
    }

    const existWiki = await wikiRepository.findOne(wiki.id)

    // TODO: store history and delete?
    if (existWiki) {
      existWiki.version = wiki.version
      existWiki.language = language
      existWiki.title = wiki.content.title
      existWiki.content = wiki.content.content
      existWiki.user = user
      existWiki.tags = tags
      existWiki.categories = categories
      existWiki.images = wiki.content.images
      existWiki.metadata = wiki.content.metadata
      existWiki.block = hash.block
      existWiki.transactionHash = hash.transactionHash
      await wikiRepository.save(existWiki)
      return true
    }

    const newWiki = wikiRepository.create({
      id: wiki.id,
      version: wiki.version,
      language,
      title: wiki.content.title,
      content: wiki.content.content,
      user,
      tags,
      categories,
      images: wiki.content.images,
      metadata: wiki.content.metadata,
      block: hash.block,
      transactionHash: hash.transactionHash,
    })

    await wikiRepository.save(newWiki)
    return true
  }
}

export default DBStoreService
