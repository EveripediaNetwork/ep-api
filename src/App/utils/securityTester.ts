import { Wiki } from '@everipedia/iq-utils'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const { window } = new JSDOM('')
const DOMPurify = createDOMPurify(window)

export type TestResult = {
  status: boolean
  message: string
}

@Injectable()
export default class SecurityTestingService {
  constructor(private configService: ConfigService) {}

  private serviceEnabled(): string {
    return this.configService.get<string>('TEST_SECURITY') || ''
  }

  private async sanitizeInput(input: string): Promise<string> {
    return DOMPurify.sanitize(input, { FORBID_ATTR: ['style'] })
  }

  private async findJSNotPurified(input: string): Promise<boolean> {
    const jsEventRegex = /\bon\w+\s*=\s*['"][^'"]*['"]/gi
    const alertObfuscation =
      /\b(alert|a=alert,a|\[1\]\.find\(alert\)|top\["al"\s*\+\s*"ert"\]\(1\)|top\/al\/.source\s*\+\s*\/ert\/.source\(1\)|al\\u0065rt\(1\)|top\['al\\145rt'\]\(1\)|top\['al\\x65rt'\]\(1\)|top\[8680439..toString\(30\)\]\(1\)|alert\?\(\)|`${alert``}`)\b/

    const evalObfuscation =
      /(^|\W)(alert|eval|prompt|confirm)((\s*?)?(\?)?\s*?\(|\s+)(.*?)(\s*?)?(\)|;|$|\W)/gi
    const jsURISchemeRegex =
      /(?=.*javascript:|.*data:)(?!(?:['"]?(?:on\w+|style)\s*=|\w+\s*=)\s*(?:\(|&#[xX]28;|%28|['"]?\+?\d))/i

    return (
      !jsEventRegex.test(input) &&
      !jsURISchemeRegex.test(input) &&
      !alertObfuscation.test(input) &&
      !evalObfuscation.test(input)
    )
  }

  private async findCSSNotPurified(input: string): Promise<boolean> {
    const styleTags = /<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi
    const styleRegex =
      /<\w+\s+(?:(?!>).)*?\sstyle\s*=\s*(?:(['"])(?:\\\1|[^\1])*?\1).*?>/gi

    return !styleTags.test(input) && !styleRegex.test(input)
  }

  public async checkContent(input: string | Wiki): Promise<TestResult> {
    if (this.serviceEnabled() === 'OFF') {
      return { status: true, message: 'Content secure' }
    }
    if (typeof input === 'object') {
      const contents = Object.values(input)
      const results = await Promise.all(
        contents.map(this.checkContent.bind(this)),
      )
      const failedResult = results.find((result) => !result.status)
      return failedResult || { status: true, message: 'Content secure' }
    }

    const purifiedString = await this.sanitizeInput(input)
    const isJSMalicious = await this.findJSNotPurified(purifiedString)
    const isCSSMalicious = await this.findCSSNotPurified(purifiedString)

    if (isJSMalicious) {
      return { status: false, message: 'Malicious Javascript detected' }
    }
    if (isCSSMalicious) {
      return { status: false, message: 'Malicious CSS detected' }
    }
    return { status: true, message: 'Content secure' }
  }
}
