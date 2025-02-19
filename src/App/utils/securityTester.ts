import { Injectable } from '@nestjs/common'
/* eslint-disable no-cond-assign */
import { Wiki } from '@everipedia/iq-utils'
import { ConfigService } from '@nestjs/config'
import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const { window } = new JSDOM('')
const DOMPurify = createDOMPurify(window)

interface Match {
  match: string
  position: number
}

interface CheckContentResult {
  status: boolean
  message: string
  data: any
  result?: string
  match?: Match[] | undefined
}

const purifyConfig = {
  FORBID_ATTR: ['style'],
  FORBID_TAGS: ['style', 'script'],
  ALLOW_DATA_ATTR: false,
}

@Injectable()
class SecurityTestingService {
  constructor(private configService: ConfigService) {}

  private serviceEnabled(): string {
    return this.configService.get<string>('TEST_SECURITY') || ''
  }

  private async sanitizeString(input: string): Promise<string | null> {
    return DOMPurify.sanitize(input, purifyConfig)
  }

  private async RegexMatcher(patterns: RegExp[], input: any): Promise<Match[]> {
    const matches: Match[] = []

    patterns.forEach((pattern) => {
      const re = new RegExp(pattern, 'gi')
      let match
      while ((match = re.exec(input)) !== null) {
        matches.push({
          match: match[0],
          position: match.index,
        })
      }
    })

    return matches
  }

  private async findJSNotPurified(input: any): Promise<Match[] | null> {
    const jsEventRegex = /\bon\w+\s*=\s*['"][^'"]*['"]/gi
    const alertObfuscation =
      /\b(alert|a=alert,a|\[1\]\.find\(alert\)|top\["al"\s*\+\s*"ert"\]\(1\)|top\/al\/.source\s*\+\s*\/ert\/.source\(1\)|al\\u0065rt\(1\)|top\['al\\145rt'\]\(1\)|top\['al\\x65rt'\]\(1\)|top\[8680439..toString\(30\)\]\(1\)|alert\?\(\)|`${alert``}`)\b/

    const evalObfuscation = /\b\w+\(\)/gi

    const jsURISchemeRegex =
      /(?=.*javascript:|.*data:)(?!(?:['"]?(?:on\w+|style)\s*=|\w+\s*=)\s*(?:\(|&#[xX]28;|%28|['"]?\+?\d))/i

    const patterns = [
      jsURISchemeRegex,
      evalObfuscation,
      alertObfuscation,
      jsEventRegex,
    ]

    return this.RegexMatcher(patterns, input)
  }

  private async findCSSNotPurified(input: any): Promise<Match[] | null> {
    const styleTags = /<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi
    const styleRegex =
      /<\w+\s+(?:(?!>).)*?\sstyle\s*=\s*(?:(['"])((?:\\\1|(?!\1).)*?)\1).*?>/gi
    const patterns = [styleTags, styleRegex]

    return this.RegexMatcher(patterns, input)
  }

  private async stringCheck(input: string, objectKey?: string) {
    let sanitizedString = await this.sanitizeString(input)
    let jsMatches = await this.findJSNotPurified(sanitizedString)
    let cssMatches = await this.findCSSNotPurified(sanitizedString)

    if (jsMatches?.length !== 0) {
      return {
        status: false,
        message: `Malicious JavaScript found in ${objectKey || 'input'}`,
        match: jsMatches,
        data: sanitizedString,
      }
    }

    if (cssMatches?.length !== 0) {
      return {
        status: false,
        message: `Malicious CSS found in ${objectKey || 'input'}`,
        match: cssMatches,
        data: sanitizedString,
      }
    }

    sanitizedString = null
    jsMatches = null
    cssMatches = null

    return {
      status: true,
      message: 'Content secure',
      data: sanitizedString,
    }
  }

  async processInBatches(promises: Promise<any>[], batchSize = 5) {
    for (let i = 0; i < promises.length; i += batchSize) {
      const batch = promises.slice(i, i + batchSize)
      await Promise.all(batch)
    }
  }

  private async checkContentRecursive(
    input: any,
    objectKey?: string,
  ): Promise<CheckContentResult> {
    const stringsInit = []
    const objectsInit = []

    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        stringsInit.push(this.stringCheck(input, objectKey))
      }
      if (typeof value === 'object' && Array.isArray(value)) {
        if (key === 'metadata') {
          for (const k of value) {
            if (k.id === 'references') {
              const refs = JSON.parse(k.value)
              for (const ref of refs) {
                objectsInit.push(
                  this.stringCheck(ref.description as string, key),
                )
              }
            } else {
              objectsInit.push(this.stringCheck(k.value as string, key))
            }
          }
        }
        if (key === 'images') {
          for (const k of value) {
            objectsInit.push(this.stringCheck(k.id as string, key))
            objectsInit.push(this.stringCheck(k.type as string, key))
          }
        }
        if (key === 'media') {
          for (const k of value) {
            objectsInit.push(this.stringCheck(k.caption as string, key))
          }
        }
        if (key === 'categories') {
          for (const k of value) {
            objectsInit.push(this.stringCheck(k.id as string, key))
            objectsInit.push(this.stringCheck(k.title as string, key))
          }
        }
        if (key === 'events') {
          for (const k of value) {
            objectsInit.push(this.stringCheck(k.title as string, key))
            objectsInit.push(this.stringCheck(k.description as string, key))
          }
        }
      }
    }

    await this.processInBatches([...stringsInit, ...objectsInit], 5)
    // await Promise.allSettled(stringsInit)
    // await Promise.allSettled(objectsInit)
    // console.log(stringsInit.length)
    // console.log(objectsInit.length)
    return {
      status: true,
      message: 'Content secure',
      data: input,
    }
  }

  public async checkContent(
    input: string | Partial<Wiki>,
  ): Promise<CheckContentResult> {
    if (this.serviceEnabled() === 'OFF') {
      return { status: true, message: 'Content secure', data: input }
    }

    const data = await this.checkContentRecursive(input)
    console.log('the ', data)
    return data
  }
}
export default SecurityTestingService
