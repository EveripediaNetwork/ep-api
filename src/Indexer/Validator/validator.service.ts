import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import * as linkify from 'linkifyjs'
import { ValidatorCodes } from '../../Database/Entities/types/IWiki'

import { ValidWiki } from '../Store/store.service'

export type ValidatorResult = {
  status: boolean
  message: string
}

@Injectable()
class IPFSValidatorService {
  private configService: ConfigService = new ConfigService()

  async validate(
    wiki: ValidWiki,
    validateJSON?: boolean,
    hashUserId?: string,
  ): Promise<ValidatorResult> {
    let message = ValidatorCodes.VALID

    const languages = ['en', 'es', 'ko', 'zh']

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
      const links = linkify.find(validatingWiki.content)
      const uiLink = this.configService.get('UI_URL')
      const alternateURLs = uiLink.split(' ')
      const validLinks = links.map(obj => ({
        ...obj,
        isLink: obj.value.startsWith('http') || obj.value.startsWith('www'),
      }))
      const externalURLs = validLinks.filter(
        link =>
          link.isLink &&
          alternateURLs.every((alt: string) => !link.value.startsWith(alt)),
      )

      if (externalURLs.length === 0) {

          return true
      }
      message = ValidatorCodes.URL
      return false
    }

    const checkTags = (validatingWiki: ValidWiki) => {   
        if(validatingWiki.images.length <= 5) {
            return true
        }
        message = ValidatorCodes.TAG
        return false
    }

    console.log('🕦 Validating Wiki content from IPFS 🕦')

    const status =
      checkLanguage(wiki) &&
      checkWords(wiki) &&
      checkCategories(wiki) &&
      checkUser(wiki) &&
      checkTags(wiki) &&
      checkSummary(wiki) &&
      checkImages(wiki) &&
      checkExternalUrls(wiki)
    console.log(message)
    return { status, message }
  }
}

export default IPFSValidatorService
