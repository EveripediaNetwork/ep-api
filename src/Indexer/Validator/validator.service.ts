import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import * as linkify from 'linkifyjs'

import { ValidWiki } from '../Store/store.service'

@Injectable()
class IPFSValidatorService {
  private configService: ConfigService = new ConfigService()

  async validate(
    wiki: ValidWiki,
    validateJSON?: boolean,
    hashUserId?: string,
  ): Promise<boolean> {
    const languages = ['en', 'es', 'ko', 'zh']

    const checkLanguage = (validatingWiki: ValidWiki) =>
      !!languages.includes(validatingWiki.language)

    const checkWords = (validatingWiki: ValidWiki) =>
      validatingWiki.content.split(' ').length >= 150

    const checkMetadataChars = (validatingWiki: ValidWiki) =>
      validatingWiki.metadata[1]?.value.length < 255

    const checkCategories = (validatingWiki: ValidWiki) =>
      validatingWiki.categories.length === 1

    const checkUser = (validatingWiki: ValidWiki) => {
      if (validateJSON) return true

      return validatingWiki.user.id.toLowerCase() === hashUserId?.toLowerCase()
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

      return false
    }

    const checkExternalUrls = (validatingWiki: ValidWiki) => {
      const links = linkify.find(validatingWiki.content)
      const uiLink = this.configService.get('UI_URL')

      const externalURLs = links.filter(
        link => link.isLink && !link.href.startsWith(uiLink),
      )

      if (externalURLs.length === 0) return true

      return false
    }

    const checkTags = (validatingWiki: ValidWiki) =>
      validatingWiki.tags.length <= 5

    console.log('🕦 Validating Wiki content from IPFS 🕦')

    return (
      checkLanguage(wiki) &&
      checkWords(wiki) &&
      checkCategories(wiki) &&
      checkUser(wiki) &&
      checkTags(wiki) &&
      checkSummary(wiki) &&
      checkImages(wiki) &&
      checkExternalUrls(wiki) &&
      checkMetadataChars(wiki)
    )
  }
}

export default IPFSValidatorService
