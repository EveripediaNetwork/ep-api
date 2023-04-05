import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import diff from 'fast-diff'
import {
  calculateWikiScore,
  EditSpecificMetaIds,
  Wiki as WikiType,
} from '@everipedia/iq-utils'
import Wiki from '../../Database/Entities/wiki.entity'
import Metadata from '../../Database/Entities/metadata.entity'

export type ValidatorResult = {
  status: boolean
  message: string
}

@Injectable()
class MetadataChangesService {
  constructor(private dataSource: DataSource) {}

  private async findWiki(id: string): Promise<Wiki | null> {
    const wikiRepository = this.dataSource.getRepository(Wiki)
    return wikiRepository.findOneBy({ id })
  }

  async removeEditMetadata(data: WikiType): Promise<WikiType> {
    const oldWiki = await this.findWiki(data.id)

    const meta = [
      ...Object.values(EditSpecificMetaIds).filter(
        (k) =>
          k !== EditSpecificMetaIds.COMMIT_MESSAGE &&
          k !== EditSpecificMetaIds.PREVIOUS_CID,
      ),
    ]
    const update = data.metadata.filter(
      (m) => !meta.includes(m.id as EditSpecificMetaIds),
    )

    let wiki
    if (oldWiki) {
      wiki = {
        ...data,
        metadata: update.concat([
          { id: EditSpecificMetaIds.PREVIOUS_CID, value: oldWiki.ipfs },
        ]),
      }
      return wiki
    }

    wiki = {
      ...data,
      metadata: update,
    }
    return wiki
  }

  async calculateChanges(newWiki: WikiType, oldWiki: Wiki): Promise<Wiki> {
    const changes: Metadata[] = []
    const blocksChanged = []

    const oldTags: { id: string }[] = []
    for (const t of await Promise.resolve(oldWiki.tags)) {
      oldTags.push({ id: t.id })
    }
    const oldCategories = []
    for (const c of await Promise.resolve(oldWiki.categories)) {
      oldCategories.push({ id: c.id, title: c.title })
    }

    const oldTagIds = oldTags.map((t) => t.id)
    const newTagIds = newWiki.tags.map((t) => t.id)

    const tags = newTagIds.filter((t) => !oldTagIds.includes(t))

    const oldCategoryIds = oldCategories.map((c) => c.id)
    const newCategoryIds = newWiki.categories.map((c) => c.id)

    const categories = newCategoryIds.filter((c) => !oldCategoryIds.includes(c))

    const checkSameArrayValues = (a: any[], b: any[]) =>
      a.length === b.length &&
      a.every((element: string, index: number) => element === b[index])

    if (oldWiki.content !== newWiki.content) {
      blocksChanged.push('content')
    }
    if (oldWiki.title !== newWiki.title) {
      blocksChanged.push('title')
    }
    if (categories.length > 0) {
      blocksChanged.push('categories')
    }
    if (
      tags.length > 0 ||
      checkSameArrayValues(tags, oldTags) ||
      oldTags.length !== tags.length
    ) {
      blocksChanged.push('tags')
    }
    if (oldWiki?.summary !== newWiki.summary) {
      blocksChanged.push('summary')
    }
    if (oldWiki?.events !== newWiki.events) {
      blocksChanged.push('events')
    }
    const oldImgId = oldWiki.images?.[0].id
    const newImgId = newWiki.images?.[0].id

    if (oldImgId !== newImgId) {
      blocksChanged.push('image')
    }
    const getWordCount = (str: string) =>
      str.split(' ').filter((n) => n !== '').length

    let contentAdded = 0
    let contentRemoved = 0
    let contentUnchanged = 0

    let wordsAdded = 0
    let wordsRemoved = 0
    diff(oldWiki.content, newWiki.content).forEach((part) => {
      if (part[0] === 1) {
        contentAdded += part[1].length
        wordsAdded += getWordCount(part[1])
      }
      if (part[0] === -1) {
        contentRemoved += part[1].length
        wordsRemoved += getWordCount(part[1])
      }
      if (part[0] === 0) {
        contentUnchanged += part[1].length
      }
    })

    const percentChanged =
      Math.round(
        (((contentAdded + contentRemoved) / contentUnchanged) * 100 +
          Number.EPSILON) *
          100,
      ) / 100
    const wordsChanged = wordsAdded + wordsRemoved
    changes.push({
      id: EditSpecificMetaIds.WORDS_CHANGED,
      value: `${wordsChanged || ''}`,
    })
    changes.push({
      id: EditSpecificMetaIds.PERCENT_CHANGED,
      value: `${percentChanged || ''}`,
    })
    changes.push({
      id: EditSpecificMetaIds.BLOCKS_CHANGED,
      value: blocksChanged.join(', '),
    })
    changes.push({
      id: EditSpecificMetaIds.WIKI_SCORE,
      value: `${calculateWikiScore(newWiki as WikiType)}`,
    })

    const noChanges = () => {
      let checkChanges = true
      checkChanges = changes.every((e) => e.value === '')
      return checkChanges
    }

    const nonEmptyChanges = changes.filter((e) => e.value !== '')

    const finalChanges = nonEmptyChanges.length > 0 ? nonEmptyChanges : changes

    const changedWiki = {
      ...newWiki,
      metadata: [...newWiki.metadata, ...(noChanges() ? [] : finalChanges)],
    }

    return changedWiki as unknown as Wiki
  }

  async appendMetadata(IPFSWiki: WikiType): Promise<WikiType> {
    const oldWiki = await this.findWiki(IPFSWiki.id)
    let wiki
    if (!oldWiki) {
      wiki = {
        ...IPFSWiki,
        metadata: IPFSWiki.metadata.concat([
          {
            id: EditSpecificMetaIds.WIKI_SCORE,
            value: `${calculateWikiScore(IPFSWiki as WikiType)}`,
          },
        ]),
      }
      return wiki
    }

    wiki = await this.calculateChanges(IPFSWiki, oldWiki)

    return wiki as unknown as WikiType
  }
}

export default MetadataChangesService
