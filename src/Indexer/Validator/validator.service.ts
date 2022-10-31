import { Injectable, UseInterceptors } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import slugify from 'slugify'
import {
  CommonMetaIds,
  EditSpecificMetaIds,
  ValidatorCodes,
} from '../../Database/Entities/types/IWiki'

import { ValidWiki } from '../Store/store.service'
import SentryInterceptor from '../../sentry/security.interceptor'
import { isValidUrl } from '../../App/utils/getWikiFields'
import { Source } from '../../Database/Entities/media.entity'

export type ValidatorResult = {
  status: boolean
  message: string
}

@UseInterceptors(SentryInterceptor)
@Injectable()
class IPFSValidatorService {
  private configService: ConfigService = new ConfigService()

  async validate(
    wiki: ValidWiki,
    validateJSON?: boolean,
    hashUserId?: string,
  ): Promise<ValidatorResult> {
    let message = ValidatorCodes.VALID_WIKI

    const languages = ['en', 'es', 'ko', 'zh']

    const checkId = (validatingWiki: ValidWiki) => {
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

    const checkLanguage = (validatingWiki: ValidWiki) => {
      const resp = !!languages.includes(validatingWiki.language)
      if (resp) {
        return resp
      }
      message = ValidatorCodes.LANGUAGE
      return resp
    }

    const checkWords = (validatingWiki: ValidWiki) => {
      if (validatingWiki.content.split(' ').length >= 100) {
        return true
      }
      message = ValidatorCodes.WORDS
      return false
    }

    const checkCategories = (validatingWiki: ValidWiki) => {
      if (validatingWiki.categories.length === 1) {
        return true
      }
      message = ValidatorCodes.CATEGORY
      return false
    }

    const checkUser = (validatingWiki: ValidWiki) => {
      const validUser =
        validatingWiki.user.id.toLowerCase() === hashUserId?.toLowerCase()

      if (validUser || validateJSON) {
        return true
      }
      message = ValidatorCodes.USER
      return false
    }

    // const checkSummary = (validatingWiki: ValidWiki) => {
    //   if (
    //     (validatingWiki.summary && validatingWiki.summary.length <= 255) ||
    //     validateJSON
    //   ) {
    //     return true
    //   }
    //   message = ValidatorCodes.SUMMARY
    //   return false
    // }

    const checkImages = (validatingWiki: ValidWiki) => {
      if (
        validatingWiki.images.length >= 1 &&
        validatingWiki.images.length <= 5
      ) {
        let result = true
        validatingWiki.images.forEach(image => {
          result = image.id.length === 46 && image.type.includes('image')
        })
        if (!result) {
          message = ValidatorCodes.IMAGE
        }
        return result
      }
      return false
    }

    const checkExternalUrls = (validatingWiki: ValidWiki) => {
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

    const checkMetadata = (validatingWiki: ValidWiki) => {
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

    const checkTags = (validatingWiki: ValidWiki) => {
      if (validatingWiki.tags.length <= 5) {
        return true
      }
      message = ValidatorCodes.TAG
      return false
    }

    const checkMedia = (validatingWiki: ValidWiki) => {
      const size = validatingWiki.media.length

      const contentCheck = validatingWiki.media.every(m => {
        if (m.source === Source.IPFS_IMG || m.source === Source.IPFS_VID) {
          return m.id.length === 46
        }
        if (m.source === Source.YOUTUBE) {
          const validYTLinkReg =
            /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/
          return (
            m.id === `https://www.youtube.com/watch?v=${m.name}` &&
            validYTLinkReg.test(m.id)
          )
        }
        if (m.source === Source.VIMEO) {
          return m.id === `https://vimeo.com/${m.name}`
        }
        return true
      })

      if (size <= 25 && contentCheck) {
        return true
      }
      message = ValidatorCodes.MEDIA
      return false
    }

    console.log('🕦 Validating Wiki content from IPFS 🕦')

    const status =
      checkId(wiki) &&
      checkLanguage(wiki) &&
      checkWords(wiki) &&
      checkCategories(wiki) &&
      checkUser(wiki) &&
      checkTags(wiki) &&
    //   checkSummary(wiki) &&
      checkImages(wiki) &&
      checkExternalUrls(wiki) &&
      checkMetadata(wiki) &&
      checkMedia(wiki)

    return { status, message }
  }
}

export default IPFSValidatorService
