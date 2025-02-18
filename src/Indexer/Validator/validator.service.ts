import slugify from 'slugify'

import {
  CommonMetaIds,
  EditSpecificMetaIds,
  ValidatorCodes,
  MediaSource,
  Wiki as WikiType,
  MediaType,
  whiteListedLinkNames,
  whiteListedDomains,
  EventType,
  Media,
} from '@everipedia/iq-utils'
import { Injectable } from '@nestjs/common'
import { isValidUrl } from '../../App/utils/getWikiFields'
import { WikiSummarySize } from '../../App/utils/getWikiSummary'

export type ValidatorResult = {
  status: boolean
  message: string
}

@Injectable()
class IPFSValidatorService {
  private isValidIpfsMedia(media: Media) {
    const isIpfsMedia =
      media.source === MediaSource.IPFS_IMG ||
      media.source === MediaSource.IPFS_VID
    if (isIpfsMedia && media.id.length !== 46) {
      return false
    }
    return true
  }

  private isValidYoutubeMedia(media: Media) {
    if (media.source !== MediaSource.YOUTUBE) return true
    const validYTLinkReg =
      /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/
    return (
      media.id === `https://www.youtube.com/watch?v=${media.name}` &&
      validYTLinkReg.test(media.id)
    )
  }

  private isValidVimeoMedia(media: Media) {
    return (
      media.source !== MediaSource.VIMEO ||
      media.id === `https://vimeo.com/${media.name}`
    )
  }

  private isValidMediaType(media: Media) {
    return !media.type || Object.values(MediaType).includes(media.type)
  }

  async validate(
    wiki: WikiType,
    validateJSON?: boolean,
    hashUserId?: string,
  ): Promise<ValidatorResult> {
    let message = ValidatorCodes.VALID_WIKI

    const languages = ['en', 'es', 'ko', 'zh']

    const checkId = (slug: string, justCheck = false) => {
      const validId = slugify(slug.toLowerCase(), {
        strict: true,
        lower: true,
        remove: /[*+~.()'"!:@]/g,
      })
      if (validId === slug && slug.length <= 60) {
        return true
      }
      if (!justCheck) message = ValidatorCodes.ID
      // Slug ID > 60
      return false
    }

    const checkLanguage = (validatingWiki: WikiType) => {
      const resp = !!languages.includes(validatingWiki.language)
      if (resp) {
        return resp
      }
      // invalid language - validatingWiki.language
      message = ValidatorCodes.LANGUAGE
      return resp
    }

    const checkWords = (validatingWiki: WikiType) => {
      if (validatingWiki.content.split(' ').length >= 100) {
        return true
      }
      // content words are < 100
      message = ValidatorCodes.WORDS
      return false
    }

    const checkCategories = (validatingWiki: WikiType) => {
      if (validatingWiki.categories.length === 1) {
        return true
      }
      // Categories for a wiki must be only one
      message = ValidatorCodes.CATEGORY
      return false
    }

    const checkUser = (validatingWiki: WikiType) => {
      const validUser =
        validatingWiki.user.id.toLowerCase() === hashUserId?.toLowerCase()

      if (validUser || validateJSON) {
        return true
      }
      // User on wiki object differs from user log data or no user present
      message = ValidatorCodes.USER
      return false
    }

    const checkSummary = (validatingWiki: WikiType) => {
      if (
        (validatingWiki.summary &&
          validatingWiki.summary.length <= WikiSummarySize.Default) ||
        validateJSON
      ) {
        return true
      }
      //  summary char length ${validatingWiki.summary.length} has execeeded limit
      message = ValidatorCodes.SUMMARY
      return false
    }

    const checkTags = (validatingWiki: WikiType) => {
      if (validatingWiki.tags.length <= 5) {
        return true
      }
      message = ValidatorCodes.TAG
      return false
    }

    const checkImages = (validatingWiki: WikiType) => {
      if (validatingWiki.images && validatingWiki.images.length <= 5) {
        const allImagesValid = validatingWiki.images.every((image) => {
          const keys = Object.keys(image)
          const hasRequiredKeys = keys.includes('id') && keys.includes('type')

          return (
            hasRequiredKeys &&
            image.id.length === 46 &&
            (image.type as string).includes('image')
          )
        })

        if (allImagesValid) {
          return true
        }
      }
      message = ValidatorCodes.IMAGE
      return false
    }

    const checkExternalUrls = (validatingWiki: WikiType) => {
      const markdownLinks = validatingWiki.content.match(/\[(.*?)\]\((.*?)\)/g)
      let isValid = true
      markdownLinks?.every((link) => {
        const linkMatch = link.match(/\[(.*?)\]\((.*?)\)/)
        const text = linkMatch?.[1]
        const url = linkMatch?.[2]

        if (
          text &&
          url &&
          whiteListedLinkNames.includes(text) &&
          !isValidUrl(url)
        ) {
          isValid = true
          return true
        }

        if (url && url.charAt(0) !== '#') {
          const validURLRecognizer = new RegExp(
            `^https?://(www\\.)?(${whiteListedDomains?.join('|')})`,
          )
          isValid = validURLRecognizer.test(url)
        }
        return true
      })
      if (isValid) {
        return true
      }
      message = ValidatorCodes.URL
      return false
    }

    const checkMetadata = (validatingWiki: WikiType) => {
      const ids = [
        ...Object.values(CommonMetaIds),
        ...Object.values(EditSpecificMetaIds),
      ]

      const valueField = validatingWiki.metadata.every((e) => {
        ids.includes(e.id as unknown as CommonMetaIds | EditSpecificMetaIds)
        if (e.id !== CommonMetaIds.REFERENCES) {
          return e.value.length < 255
        }
        return true
      })

      if (valueField) {
        return true
      }

      message = ValidatorCodes.METADATA
      return false
    }

    const checkMedia = (validatingWiki: WikiType) => {
      if (!validatingWiki.media || validatingWiki.media.length === 0)
        return true

      const subMessages: string[] = []

      if (validatingWiki.media.length > 25) {
        subMessages.push(
          `Excess media: ${validatingWiki.media.length} (max 25)`,
        )
      }

      validatingWiki.media.forEach((media, index) => {
        if (!this.isValidIpfsMedia(media)) {
          subMessages.push(
            `Invalid IPFS media ID at index ${index}: ${media.id}`,
          )
        }
        if (!this.isValidYoutubeMedia(media)) {
          subMessages.push(
            `Invalid YouTube link at index ${index}: ${media.id}`,
          )
        }
        if (!this.isValidVimeoMedia(media)) {
          subMessages.push(`Invalid Vimeo link at index ${index}: ${media.id}`)
        }
        if (!this.isValidMediaType(media)) {
          subMessages.push(
            `Invalid media type at index ${index}: ${media.type}`,
          )
        }
      })

      const iconCount = validatingWiki.media.filter(
        (m) => m.type === MediaType.ICON,
      ).length
      if (iconCount > 1) {
        subMessages.push(`Too many icons: ${iconCount} (max 1)`)
      }

      const isValidMedia = subMessages.length === 0

      if (!isValidMedia) {
        message = `${ValidatorCodes.MEDIA}\n\n${subMessages.join(
          '\n',
        )}` as ValidatorCodes
      }

      return isValidMedia
    }

    const checkEvents = (validatingWiki: WikiType): boolean => {
      const checkDate = (str: string): boolean => {
        const date = new Date(str)
        return date.toString() !== 'Invalid Date'
      }

      if (!validatingWiki.events || validatingWiki.events.length === 0)
        return true

      const subMessages: string[] = []

      validatingWiki.events.forEach((event, index) => {
        const eventErrors: string[] = []

        // Check date validity
        if (event.type === EventType.MULTIDATE) {
          if (!checkDate(event.multiDateStart as string)) {
            eventErrors.push('Invalid multiDateStart')
          }
          if (!checkDate(event.multiDateEnd as string)) {
            eventErrors.push('Invalid multiDateEnd')
          }
        } else if (!checkDate(event.date)) {
          eventErrors.push('Invalid date')
        }

        // Check link validity
        if (event.link) {
          if (!isValidUrl(event.link)) {
            eventErrors.push('Invalid link URL')
          } else if (event.link.length >= 500) {
            eventErrors.push(
              `Link too long: ${event.link.length} chars (max 500)`,
            )
          }
        }

        // Check description validity
        if (event.description && event.description.length > 255) {
          eventErrors.push(
            `Description too long: ${event.description.length} chars (max 255)`,
          )
        }

        // Check title validity
        if (event.title && event.title.length >= 80) {
          eventErrors.push(
            `Title too long: ${event.title.length} chars (max 80})`,
          )
        }

        // Check type validity
        if (!Object.values(EventType).includes(event.type)) {
          eventErrors.push(`Invalid event type: ${event.type}`)
        }

        if (eventErrors.length > 0) {
          subMessages.push(
            `Event at index ${index} has following errors:\n  ${eventErrors.join(
              '\n  ',
            )}`,
          )
        }
      })

      const isValid = subMessages.length === 0

      if (!isValid) {
        message = `${ValidatorCodes.EVENTS}\n${subMessages.join(
          '\n',
        )}` as ValidatorCodes
      }

      return isValid
    }

    const checkLinkedWikis = (validatingWiki: WikiType) => {
      if (!validatingWiki.linkedWikis) return true
      let isValid = true

      for (const slugs of Object.values(validatingWiki.linkedWikis)) {
        if (slugs.length > 20) {
          isValid = false
          break
        }

        for (const slug of slugs) {
          isValid = checkId(slug, true)
          if (!isValid) break
        }
        if (!isValid) break
      }

      if (!isValid) message = ValidatorCodes.LINKED_WIKIS

      return isValid
    }

    console.log('🕦 Validating Wiki content from IPFS 🕦')

    const status =
      checkId(wiki.id) &&
      checkLanguage(wiki) &&
      checkWords(wiki) &&
      checkCategories(wiki) &&
      checkUser(wiki) &&
      checkSummary(wiki) &&
      checkTags(wiki) &&
      checkImages(wiki) &&
      checkExternalUrls(wiki) &&
      checkMetadata(wiki) &&
      checkMedia(wiki) &&
      checkLinkedWikis(wiki) &&
      checkEvents(wiki)

    return { status, message }
  }
}

export default IPFSValidatorService
