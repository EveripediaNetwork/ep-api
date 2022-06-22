import { Injectable, UseInterceptors } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Connection } from 'typeorm'
// import * as linkify from 'linkifyjs'
import diff from 'fast-diff'

import slugify from 'slugify'
import {
  CommonMetaIds,
  EditSpecificMetaIds,
  ValidatorCodes,
} from '../../Database/Entities/types/IWiki'
import Wiki from '../../Database/Entities/wiki.entity'

import { ValidWiki } from '../Store/store.service'
import SentryInterceptor from '../../sentry/security.interceptor'

export type ValidatorResult = {
  status: boolean
  message: string
}

@UseInterceptors(SentryInterceptor)
@Injectable()
class IPFSValidatorService {
  private configService: ConfigService = new ConfigService()

  constructor(private connection: Connection) {}

  async validate(
    wiki: ValidWiki,
    validateJSON?: boolean,
    hashUserId?: string,
  ): Promise<ValidatorResult> {
    const wikiRepository = this.connection.getRepository(Wiki)
    const oldWiki = await wikiRepository.findOne(wiki.id)

    let message = ValidatorCodes.VALID_WIKI

    const languages = ['en', 'es', 'ko', 'zh']

    const checkId = (validatingWiki: ValidWiki) => {
      const validId = slugify(validatingWiki.id.toLowerCase(), {
        strict: true,
        lower: true,
        remove: /[*+~.()'"!:@]/g,
      })
      if (validId === validatingWiki.id) {
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
      if (validatingWiki.content.split(' ').length >= 150) {
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

    const checkSummary = (validatingWiki: ValidWiki) => {
      if (validatingWiki.summary) {
        return validatingWiki.summary.length <= 128
      }

      return true
    }

    const checkImages = (validatingWiki: ValidWiki) => {
      if (
        validatingWiki.images.length >= 1 &&
        validatingWiki.images.length <= 5
      ) {
        return true
      }
      message = ValidatorCodes.IMAGE
      return false
    }

    const checkExternalUrls = (validatingWiki: ValidWiki) => {
      const uiLink = this.configService.get<string>('UI_URL')
      const whitelistedDomains = uiLink?.split(' ')
      const markdownLinks = validatingWiki.content.match(/\[(.*?)\]\((.*?)\)/g)
      let isValid = true
      markdownLinks?.every(link => {
        const url = link.match(/\((.*?)\)/g)?.[0].replace(/\(|\)/g, '')
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

    const checkMetadata = (
      validatingWiki: ValidWiki,
      otherWiki: Wiki | undefined,
    ) => {
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

      console.log(validatingWiki.content === otherWiki?.content)

      let checkValues = true

      if (validatingWiki.content !== otherWiki?.content) {
        if (otherWiki && otherWiki.id === validatingWiki.id) {
          const getWordCount = (str: string) =>
            str.split(' ').filter(n => n !== '').length

          let contentAdded = 0
          let contentRemoved = 0
          let contentUnchanged = 0

          let wordsAdded = 0
          let wordsRemoved = 0
          diff(otherWiki.content, validatingWiki.content).forEach(part => {
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

          checkValues =
            validatingWiki.metadata.find(
              e => e.id === EditSpecificMetaIds.PERCENT_CHANGED,
            )?.value === String(percentChanged) &&
            validatingWiki.metadata.find(
              e => e.id === EditSpecificMetaIds.WORDS_CHANGED,
            )?.value === String(wordsChanged)
        }
      }
      if (checkValues && valueField) {
        return true
      }

      message = ValidatorCodes.METADATA
      return false
    }

    const checkTags = (validatingWiki: ValidWiki) => {
      if (validatingWiki.images.length <= 5) {
        return true
      }
      message = ValidatorCodes.TAG
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
      checkSummary(wiki) &&
      checkImages(wiki) &&
      checkExternalUrls(wiki) &&
      checkMetadata(wiki, oldWiki)

    return { status, message }
  }
}

export default IPFSValidatorService
