import { Injectable } from '@nestjs/common'
import { ValidWiki } from '../Store/store.service'

@Injectable()
class IPFSValidatorService {
  async validate(wiki: ValidWiki, hashUserId: string): Promise<boolean> {
    const languages = ['en', 'es', 'ko', 'zh']

    const checkLanguage = (validatingWiki: ValidWiki) =>
        languages.includes(validatingWiki.language) ? true : false

    const checkWords = (validatingWiki: ValidWiki) =>
        validatingWiki.content.split(" ").length >= 150 ? true : false

    const checkCategories = (validatingWiki: ValidWiki) =>
        validatingWiki.categories.length === 1 ? true : false

    const checkUser = (validatingWiki: ValidWiki) =>
      validatingWiki.user.id === hashUserId ? true : false

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

    const checkTags =  (validatingWiki: ValidWiki) => {
      if (
        validatingWiki.images.length >= 0 ||
        validatingWiki.images.length <= 5
      ) {
        return true
      }

      return false
    }

    console.log('🕦 Validating Wiki content from IPFS 🕦')

    return checkLanguage(wiki)
      && checkWords(wiki)
      && checkCategories(wiki)
      && checkUser(wiki)
      && checkTags(wiki)
      && checkSummary(wiki)
      && checkImages(wiki)
  }
}

export default IPFSValidatorService
