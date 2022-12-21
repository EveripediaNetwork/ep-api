import { Injectable, UseInterceptors } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import slugify from 'slugify'

import {
  CommonMetaIds,
  EditSpecificMetaIds,
  ValidatorCodes,
  MediaSource,
  Wiki as WikiType,
  MediaType,
} from '@everipedia/iq-utils'
import SentryInterceptor from '../../sentry/security.interceptor'
import { isValidUrl } from '../../App/utils/getWikiFields'
import { WikiSummarySize } from '../../App/utils/getWikiSummary'

export type ValidatorResult = {
  status: boolean
  message: string
}

@UseInterceptors(SentryInterceptor)
@Injectable()
class IPFSValidatorService {
  private configService: ConfigService = new ConfigService()

  async validate(
    wiki: WikiType,
    validateJSON?: boolean,
    hashUserId?: string,
  ): Promise<ValidatorResult> {
    let message = ValidatorCodes.VALID_WIKI

    const languages = ['en', 'es', 'ko', 'zh']

    const checkId = (validatingWiki: WikiType) => {
      const validId = slugify(validatingWiki.id.toLowerCase(), {
        strict: true,
        lower: true,
        remove: /[*+~.()'"!:@]/g,
      })
      if (validId === validatingWiki.id && validatingWiki.id.length <= 60) {
        return true
      }
      message = ValidatorCodes.ID
      return false
    }

    const checkLanguage = (validatingWiki: WikiType) => {
      const resp = !!languages.includes(validatingWiki.language)
      if (resp) {
        return resp
      }
      message = ValidatorCodes.LANGUAGE
      return resp
    }

    const checkWords = (validatingWiki: WikiType) => {
      if (validatingWiki.content.split(' ').length >= 100) {
        return true
      }
      message = ValidatorCodes.WORDS
      return false
    }

    const checkCategories = (validatingWiki: WikiType) => {
      if (validatingWiki.categories.length === 1) {
        return true
      }
      message = ValidatorCodes.CATEGORY
      return false
    }

    const checkUser = (validatingWiki: WikiType) => {
      const validUser =
        validatingWiki.user.id.toLowerCase() === hashUserId?.toLowerCase()

      if (validUser || validateJSON) {
        return true
      }
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
      message = ValidatorCodes.SUMMARY
      return false
    }

    const checkImages = (validatingWiki: WikiType) => {
      if (!validatingWiki.images) return false
      if (
        validatingWiki.images.length >= 1 &&
        validatingWiki.images.length <= 5
      ) {
        let result = true
        validatingWiki.images.forEach(image => {
          const keys = Object.keys(image)
          const key = keys.includes('id') && keys.includes('type')
          result =
            key &&
            image.id.length === 46 &&
            (image.type as string).includes('image')
        })
        if (!result) {
          message = ValidatorCodes.IMAGE
        }
        return result
      }
      return false
    }

    const checkExternalUrls = (validatingWiki: WikiType) => {
      const whitelistedDomains = this.configService
        .get<string>('UI_URL')
        ?.split(' ')
      const WidgetNames =
        this.configService.get<string>('WIDGET_NAMES')?.split(' ') || []
      const markdownLinks = validatingWiki.content.match(/\[(.*?)\]\((.*?)\)/g)
      let isValid = true
      markdownLinks?.every(link => {
        const linkMatch = link.match(/\[(.*?)\]\((.*?)\)/)
        const text = linkMatch?.[1]
        const url = linkMatch?.[2]

        if (text && url && WidgetNames.includes(text) && !isValidUrl(url)) {
          isValid = true
          return true
        }

        if (url && url.charAt(0) !== '#') {
          const validURLRecognizer = new RegExp(
            `^https?://(www\\.)?(${whitelistedDomains?.join('|')})`,
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

      const valueField = validatingWiki.metadata.every(e => {
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

    const checkTags = (validatingWiki: WikiType) => {
      if (validatingWiki.tags.length <= 5) {
        return true
      }
      message = ValidatorCodes.TAG
      return false
    }

    const checkMedia = (validatingWiki: WikiType) => {
      if (!validatingWiki.media) return true

      const size = validatingWiki.media.length

      const contentCheck = validatingWiki.media.every(m => {
        let isContentValid = false

        if (
          m.source === MediaSource.IPFS_IMG ||
          m.source === MediaSource.IPFS_VID
        ) {
          isContentValid = m.id.length === 46
        }
        if (m.source === MediaSource.YOUTUBE) {
          const validYTLinkReg =
            /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/
          isContentValid =
            m.id === `https://www.youtube.com/watch?v=${m.name}` &&
            validYTLinkReg.test(m.id)
        }
        if (m.source === MediaSource.VIMEO) {
          isContentValid = m.id === `https://vimeo.com/${m.name}`
        }
        if (m.type && !(m.type in MediaType)) {
          isContentValid = false
        }
        return isContentValid
      })

      const wikiMediasWithIcon = validatingWiki.media.filter(
        m => m.type === MediaType.ICON,
      )

      const isValidMedia =
        size <= 25 && contentCheck && wikiMediasWithIcon.length <= 1
      if (!isValidMedia) message = ValidatorCodes.MEDIA
      return isValidMedia
    }

    console.log('🕦 Validating Wiki content from IPFS 🕦')

    const status =
      checkId(wiki) &&
      checkLanguage(wiki) &&
      checkWords(wiki) &&
      checkCategories(wiki) &&
      checkUser(wiki) &&
      checkTags(wiki) &&
      checkSummary(wiki) &&
      checkImages(wiki) &&
      checkExternalUrls(wiki) &&
      checkMetadata(wiki) &&
      checkMedia(wiki)

    return { status, message }
  }
}

export default IPFSValidatorService
