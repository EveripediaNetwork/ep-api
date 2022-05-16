import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import * as linkify from 'linkifyjs'

import { IWiki } from '../../types/IWiki'

@Injectable()
class IPFSValidatorService {
  private configService: ConfigService = new ConfigService()

  async validate(
    wiki: IWiki,
    validateJSON?: boolean,
    hashUserId?: string,
  ): Promise<boolean> {
    const languages = ['en', 'es', 'ko', 'zh']

    const checkLanguage = (validatingWiki: IWiki) =>
      !!languages.includes(validatingWiki.language)

    const checkWords = (validatingWiki: IWiki) =>
      validatingWiki.content.split(' ').length >= 150

    const checkMetadataChars = (validatingWiki: IWiki) =>
      validatingWiki.metadata[1]?.value.length < 255

    const checkCategories = (validatingWiki: IWiki) =>
      validatingWiki.categories.length === 1

    const checkUser = (validatingWiki: IWiki) => {
      if (validateJSON) return true

      return validatingWiki.user.id.toLowerCase() === hashUserId?.toLowerCase()
    }

    const checkSummary = (validatingWiki: IWiki) => {
      if (validatingWiki.summary) {
        return validatingWiki.summary.length <= 128
      }

      return true
    }

    const checkImages = (validatingWiki: IWiki) => {
      if (
        validatingWiki.images.length >= 1 &&
        validatingWiki.images.length <= 5
      ) {
        return true
      }

      return false
    }

    const checkExternalUrls = (validatingWiki: IWiki) => {
      const links = linkify.find(validatingWiki.content)
      const uiLink = this.configService.get('UI_URL')

      const externalURLs = links.filter(
        link => link.isLink && !link.href.startsWith(uiLink),
      )

      if (externalURLs.length === 0) return true

      return false
    }

    const checkTags = (validatingWiki: IWiki) =>
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
