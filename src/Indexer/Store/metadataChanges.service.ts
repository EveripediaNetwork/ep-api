import { Injectable, UseInterceptors } from '@nestjs/common'
import { Connection } from 'typeorm'
import diff from 'fast-diff'
import Wiki from '../../Database/Entities/wiki.entity'
import SentryInterceptor from '../../sentry/security.interceptor'
import { ValidWiki } from './store.service'
import {
  contentQuality,
  countQuality,
  getSocialsCount,
  getWikiCitationLinks,
  getWikiInternalLinks,
} from '../../App/utils/getWikiFields'
import Metadata from '../../Database/Entities/metadata.entity'
import { EditSpecificMetaIds } from '../../Database/Entities/types/IWiki'

export type ValidatorResult = {
  status: boolean
  message: string
}

@UseInterceptors(SentryInterceptor)
@Injectable()
class MetadataChangesService {
  constructor(private connection: Connection) {}

  private async calculateWikiScore(wiki: ValidWiki): Promise<number> {
    const CONTENT_SCORE_WEIGHT = 0.8
    const INTERNAL_LINKS_SCORE_WEIGHT = 0.5
    const CITATIONS_SCORE_WEIGHT = 0.5
    const MEDIA_SCORE_WEIGHT = 0.3
    const TAGS_SCORE_WEIGHT = 0.3
    const SUMMARY_SCORE_WEIGHT = 0.5
    const SOCIAL_SCORE_WEIGHT = 0.5

    const IDEAL_INTERNAL_LINKS_COUNT = 10
    const IDEAL_CITATIONS_COUNT = 10
    const IDEAL_MEDIA_COUNT = 5
    const IDEAL_TAGS_COUNT = 3
    const IDEAL_SUMMARY_LENGTH = 100
    const IDEAL_SOCIAL_MEDIA_COUNT = 4

    const wordCount = wiki.content.split(' ').length
    const internalLinksCount = getWikiInternalLinks(wiki.content)
    const citationCount = getWikiCitationLinks(wiki as unknown as Wiki)
    const mediaCount = wiki.media?.length || 0
    const tagsCount = wiki.tags?.length || 0
    const summaryWordCount = wiki.summary?.length || 0
    const socialsCount = getSocialsCount(wiki as unknown as Wiki)

    const contentScore = contentQuality(wordCount)
    const internalLinksScore = countQuality(
      IDEAL_INTERNAL_LINKS_COUNT,
      internalLinksCount,
    )
    const citationScore = countQuality(IDEAL_CITATIONS_COUNT, citationCount)
    const mediaScore = countQuality(IDEAL_MEDIA_COUNT, mediaCount)
    const tagsScore = countQuality(IDEAL_TAGS_COUNT, tagsCount)
    const summaryScore = countQuality(IDEAL_SUMMARY_LENGTH, summaryWordCount)
    const socialsScore = countQuality(IDEAL_SOCIAL_MEDIA_COUNT, socialsCount)

    const sumOfWeights =
      CONTENT_SCORE_WEIGHT +
      INTERNAL_LINKS_SCORE_WEIGHT +
      CITATIONS_SCORE_WEIGHT +
      MEDIA_SCORE_WEIGHT +
      TAGS_SCORE_WEIGHT +
      SUMMARY_SCORE_WEIGHT +
      SOCIAL_SCORE_WEIGHT

    const score =
      (contentScore * CONTENT_SCORE_WEIGHT +
        internalLinksScore * INTERNAL_LINKS_SCORE_WEIGHT +
        citationScore * CITATIONS_SCORE_WEIGHT +
        mediaScore * MEDIA_SCORE_WEIGHT +
        tagsScore * TAGS_SCORE_WEIGHT +
        summaryScore * SUMMARY_SCORE_WEIGHT +
        socialsScore * SOCIAL_SCORE_WEIGHT) /
      sumOfWeights

    const percentScore = Math.floor(score * 100)
    return percentScore
  }
  
  async removeEditMetadata(data: ValidWiki): Promise<ValidWiki> {
    const meta = [
      ...Object.values(EditSpecificMetaIds).filter(
        k => k !== EditSpecificMetaIds.COMMIT_MESSAGE,
      ),
    ]
    const update = data.metadata.filter(
      m => !meta.includes(m.id as EditSpecificMetaIds),
    )
    const wiki = {
      ...data,
      metadata: update,
    }
    return wiki
  }

  async calculateChanges(newWiki: ValidWiki, oldWiki: Wiki): Promise<Wiki> {
    const changes: Metadata[] = []
    const blocksChanged = []

    if (oldWiki.content !== newWiki.content) {
      blocksChanged.push('content')
    }
    if (oldWiki.title !== newWiki.title) blocksChanged.push('title')
    if (oldWiki.categories !== newWiki.categories)
      blocksChanged.push('categories')
    if (oldWiki.tags !== newWiki.tags) blocksChanged.push('tags')
    if (oldWiki.summary !== newWiki.summary) blocksChanged.push('summary')

    const oldImgId = oldWiki.images && oldWiki.images[0].id
    const newImgId = newWiki.images && newWiki.images[0].id
    if (oldImgId !== newImgId) {
      blocksChanged.push('image')
    }
    const getWordCount = (str: string) =>
      str.split(' ').filter(n => n !== '').length

    let contentAdded = 0
    let contentRemoved = 0
    let contentUnchanged = 0

    let wordsAdded = 0
    let wordsRemoved = 0
    diff(oldWiki.content, newWiki.content).forEach(part => {
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
      value: `${wordsChanged}`,
    })
    changes.push({
      id: EditSpecificMetaIds.PERCENT_CHANGED,
      value: `${percentChanged}`,
    })
    changes.push({
      id: EditSpecificMetaIds.BLOCKS_CHANGED,
      value: blocksChanged.join(', '),
    })
    changes.push({
      id: EditSpecificMetaIds.WIKI_SCORE,
      value: `${await this.calculateWikiScore(newWiki)}`,
    })

    const changedWiki = {
      ...newWiki,
      metadata: newWiki.metadata.concat(changes),
    }

    return changedWiki as unknown as Wiki
  }

  async appendMetadata(IPFSWiki: ValidWiki): Promise<ValidWiki> {
    const wikiRepository = this.connection.getRepository(Wiki)
    const oldWiki = await wikiRepository.findOne(IPFSWiki.id)
    let wiki
    if (!oldWiki) {
      wiki = {
        ...IPFSWiki,
        metadata: IPFSWiki.metadata.concat([
          {
            id: EditSpecificMetaIds.WIKI_SCORE,
            value: `${await this.calculateWikiScore(IPFSWiki)}`,
          },
        ]),
      }
      return wiki
    }

    wiki = await this.calculateChanges(IPFSWiki, oldWiki)

    return wiki as unknown as ValidWiki
  }
}

export default MetadataChangesService
