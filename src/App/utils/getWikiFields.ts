import Metadata from '../../Database/Entities/metadata.entity'
import {
  CommonMetaIds,
  EditSpecificMetaIds,
  WikiPossibleSocialsList,
} from '../../Database/Entities/types/IWiki'
import Wiki from '../../Database/Entities/wiki.entity'

const MIN_CONTENT_WORD_COUNT = 10
const GOOD_CONTENT_WORD_COUNT = 500
const IDEAL_CONTENT_WORD_COUNT = 1500

export const getWikiMetadataById = (
  wiki: Wiki,
  id: CommonMetaIds | EditSpecificMetaIds,
) => wiki.metadata.find((m: Metadata) => m.id === id)

export const contentQuality = (wordCount: number): number => {
  const scoreMin = 0.0
  const scoreMax = 1.0

  let score = 0

  if (wordCount < MIN_CONTENT_WORD_COUNT) {
    return scoreMin
  }

  if (
    wordCount >= MIN_CONTENT_WORD_COUNT &&
    wordCount <= GOOD_CONTENT_WORD_COUNT
  ) {
    score = wordCount / GOOD_CONTENT_WORD_COUNT
    score *= 0.8
  }

  if (
    wordCount > GOOD_CONTENT_WORD_COUNT &&
    wordCount < IDEAL_CONTENT_WORD_COUNT
  ) {
    const baseScore = 0.8
    const wordCountAboveGood = wordCount - GOOD_CONTENT_WORD_COUNT
    const extraScoreFactor =
      wordCountAboveGood / (IDEAL_CONTENT_WORD_COUNT - GOOD_CONTENT_WORD_COUNT)
    const extraScore = Math.sqrt(extraScoreFactor) * 0.2
    score = baseScore + extraScore
  }

  if (wordCount >= IDEAL_CONTENT_WORD_COUNT) {
    return scoreMax
  }

  if (score < scoreMin) {
    return scoreMin
  }

  if (score > scoreMax) {
    return scoreMax
  }

  return score
}

export const countQuality = (idealCount: number, realCount: number): number => {
  const scoreMin = 0.0
  const scoreMax = 1.0

  const score = realCount / idealCount

  if (score < scoreMin) {
    return scoreMin
  }

  if (score > scoreMax) {
    return scoreMax
  }

  return score
}

export const isValidUrl = (urlString: string) => {
  try {
    return Boolean(new URL(urlString))
  } catch (e) {
    return false
  }
}

export const getWikiInternalLinks = (content: string): number => {
  const markdownLinks = content.match(/\[(.*?)\]\((.*?)\)/g)
  let internalLinksCount = 0
  markdownLinks?.forEach(link => {
    const linkMatch = link.match(/\[(.*?)\]\((.*?)\)/)
    const url = linkMatch?.[2]
    if (url && url.charAt(0) !== '#' && isValidUrl(url)) {
      const urlURL = new URL(url)
      if (
        urlURL.hostname === 'everipedia.org' ||
        urlURL.hostname.endsWith('.everipedia.org')
      ) {
        internalLinksCount += 1
      }
    }
  })

  return internalLinksCount
}

export const getWikiCitationLinks = (wiki: Wiki) => {
  const rawWikiReferences = getWikiMetadataById(
    wiki,
    CommonMetaIds.REFERENCES,
  )?.value

  if (
    rawWikiReferences === undefined ||
    rawWikiReferences?.trim().length === 0
  ) {
    return 0
  }

  const wikiReferences = JSON.parse(rawWikiReferences)

  return wikiReferences.length
}

export const getSocialsCount = (wiki: Wiki): number => {
  let socialsCount = 0
  wiki.metadata.forEach(meta => {
    if (WikiPossibleSocialsList.includes(meta.id as CommonMetaIds)) {
      if (meta.value) {
        socialsCount += 1
      }
    }
  })
  return socialsCount
}
