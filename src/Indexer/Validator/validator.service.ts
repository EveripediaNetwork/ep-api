import { Injectable } from '@nestjs/common'
import { ValidWiki } from '../Store/store.service'

@Injectable()
class IPFSValidatorService {
  async validate(wiki: ValidWiki, hashUserId: string): Promise<boolean> {
    const languages = ['en', 'es', 'ko', 'zh']

    const checks = {
      language: (validatingWiki: ValidWiki) =>
        !!languages.includes(validatingWiki.language),

      words: (validatingWiki: ValidWiki) =>
        validatingWiki.content.length >= 150,

      categories: (validatingWiki: ValidWiki) =>
        validatingWiki.categories.length === 1,

      summary: (validatingWiki: ValidWiki) => {
        if (validatingWiki.summary) {
          return validatingWiki.summary.length <= 128
        }

        return true
      },

      images: (validatingWiki: ValidWiki) => {
        if (
          validatingWiki.images.length === 1 ||
          validatingWiki.images.length <= 5
        ) {
          return true
        }

        return false
      },

      tags: (validatingWiki: ValidWiki) => {
        if (
          validatingWiki.images.length >= 0 ||
          validatingWiki.images.length <= 5
        ) {
          return true
        }

        return false
      },

      user: (validatingWiki: ValidWiki) =>
        validatingWiki.user.id === hashUserId,
    }

    console.log('🕦 Validating Wiki content from IPFS 🕦')

    async function validateChecks(
      validatingWiki: ValidWiki,
      checksTodo: any[],
    ) {
      return checksTodo.reduce(
        (ValidatedWiki: ValidWiki, check: (ValidatedWiki: ValidWiki) => any) =>
          check(ValidatedWiki),
        validatingWiki,
      )
    }

    if (
      await validateChecks(wiki, [
        checks.language,
        checks.words,
        checks.categories,
        checks.summary,
        checks.images,
        checks.tags,
        checks.user,
      ])
    ) {
      console.log('✅ Validated Wiki content! IPFS going through...')
      return true
    }

    return false
  }
}

export default IPFSValidatorService
