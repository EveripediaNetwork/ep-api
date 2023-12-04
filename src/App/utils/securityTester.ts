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

  private async sanitizeObject(obj: any): Promise<any> {
    const sanitizedObj: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        sanitizedObj[key] = await Promise.all(
          value.map(async (item) => {
            if (typeof item === 'string') {
              return this.sanitizeString(item)
            }
            if (typeof item === 'object' && item !== null) {
              return this.sanitizeObject(item)
            }
            return item
          }),
        )
      } else if (typeof value === 'string') {
        sanitizedObj[key] = await this.sanitizeString(value)
      } else if (typeof value === 'object' && value !== null) {
        sanitizedObj[key] = await this.sanitizeObject(value)
      } else {
        sanitizedObj[key] = value
      }
    }
    return sanitizedObj
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
  /(^|\W)(alert|eval|prompt|confirm(?!\s+scheduling)((\s*?)?(\?)?\s*?\(|\s+)(.*?)(\s*?)?(\)|;|$|\W))/gi;
    
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

  private async checkContentRecursive(
    input: any,
    objectKey?: string,
  ): Promise<CheckContentResult> {
    if (typeof input === 'string') {
      const sanitizedString = await this.sanitizeString(input)
      const jsMatches = await this.findJSNotPurified(sanitizedString)
      const cssMatches = await this.findCSSNotPurified(sanitizedString)

      if (jsMatches.length !== 0) {
        return {
          status: false,
          message: `Malicious JavaScript found in ${objectKey || 'input'}`,
          match: jsMatches,
          data: sanitizedString,
        }
      }

      if (cssMatches.length !== 0) {
        return {
          status: false,
          message: `Malicious CSS found in ${objectKey || 'input'}`,
          match: cssMatches,
          data: sanitizedString,
        }
      }

      return {
        status: true,
        message: 'Content secure',
        data: sanitizedString,
      }
    }

    if (typeof input === 'object' && input !== null) {
      const sanitizedObject = await this.sanitizeObject(input)
      for (const [key, value] of Object.entries(sanitizedObject)) {
        const match = await this.checkContentRecursive(value, key)
        if (match && !match.status) {
          return {
            ...match,
            data: sanitizedObject,
          }
        }
      }
      return {
        status: true,
        message: 'Content secure',
        data: sanitizedObject,
      }
    }
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

    return this.checkContentRecursive(input)
  }
}
