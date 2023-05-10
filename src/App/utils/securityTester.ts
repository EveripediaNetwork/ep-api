/* eslint-disable no-cond-assign */
import { Wiki } from '@everipedia/iq-utils'
import { Injectable } from '@nestjs/common'
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
export default class SecurityTestingService {
  constructor(private configService: ConfigService) {}

  private serviceEnabled(): string {
    return this.configService.get<string>('TEST_SECURITY') || ''
  }

  private async sanitizeString(input: string): Promise<string> {
    return DOMPurify.sanitize(input, purifyConfig)
  }

  private async sanitizeObject(
    input: Record<string, any>,
  ): Promise<Record<string, any>> {
    const output: Record<string, any> = {}

    for (const [key, value] of Object.entries(input)) {
      if (value !== null && typeof value === 'object') {
        if (Array.isArray(value)) {
          output[key] = []
          for (const elem of value) {
            const sanitizedElem = await this.sanitizeObject(elem)
            output[key].push(sanitizedElem)
          }
        } else {
          output[key] = await this.sanitizeObject(value)
        }
      } else {
        output[key] =
          typeof value === 'string'
            ? DOMPurify.sanitize(value, purifyConfig)
            : value
      }
    }
    return output
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

  private async findJSNotPurified(input: any): Promise<Match[]> {
    const jsEventRegex = /\bon\w+\s*=\s*['"][^'"]*['"]/gi
    const alertObfuscation =
      /\b(alert|a=alert,a|\[1\]\.find\(alert\)|top\["al"\s*\+\s*"ert"\]\(1\)|top\/al\/.source\s*\+\s*\/ert\/.source\(1\)|al\\u0065rt\(1\)|top\['al\\145rt'\]\(1\)|top\['al\\x65rt'\]\(1\)|top\[8680439..toString\(30\)\]\(1\)|alert\?\(\)|`${alert``}`)\b/

    const evalObfuscation =
      /(^|\W)(alert|eval|prompt|confirm)((\s*?)?(\?)?\s*?\(|\s+)(.*?)(\s*?)?(\)|;|$|\W)/gi
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

  private async findCSSNotPurified(input: any): Promise<Match[]> {
    const styleTags = /<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi
    const styleRegex =
      /<\w+\s+(?:(?!>).)*?\sstyle\s*=\s*(?:(['"])(?:\\\1|[^\1])*?\1).*?>/gi
    const patterns = [styleTags, styleRegex]

    return this.RegexMatcher(patterns, input)
  }

  public async checkContent(
    input: string | Wiki,
    location?: string,
  ): Promise<CheckContentResult> {
    if (this.serviceEnabled() === 'OFF') {
      return { status: true, message: 'Content secure', data: input }
    }

    const purifiedString =
      typeof input === 'object'
        ? await this.sanitizeObject(input)
        : await this.sanitizeString(input)

    if (typeof purifiedString === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value !== null) {
          const match = await this.checkContent(value, key)
          if (match && !match.status) {
            return {
              ...match,
              data: purifiedString,
            }
          }
        }
      }
    }

    const isJSMalicious = await this.findJSNotPurified(purifiedString)
    const isCSSMalicious = await this.findCSSNotPurified(purifiedString)

    if (isJSMalicious.length !== 0) {
      return {
        status: false,
        message: `Malicious JavaScript found in ${location}`,
        match: isJSMalicious,
        data: purifiedString as Wiki,
      }
    }
    if (isCSSMalicious.length !== 0) {
      return {
        status: false,
        message: `Malicious CSS found in ${location}`,
        match: isCSSMalicious,
        data: purifiedString,
      }
    }
    return {
      status: true,
      message: 'Content secure',
      data: purifiedString as Wiki,
    }
  }
}
