/* eslint-disable no-template-curly-in-string */
import { Injectable } from '@nestjs/common'
import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const { window } = new JSDOM('')
const DOMPurify = createDOMPurify(window)

@Injectable()
export default class SecurityTestingService {
  private async sanitizeInput(input: string) {
    
    return DOMPurify.sanitize(input)
  }

  public async findCharsNotPurified(input: string) {
    const purifiedSring = await this.sanitizeInput(input)
    // console.log(purifiedSring)
    const alertRegex = /alert\([\s\S]*?\)/
    const alertObfuscation =
      /\b(alert|a=alert,a|\[1\]\.find\(alert\)|top\["al"\s*\+\s*"ert"\]\(1\)|top\/al\/.source\s*\+\s*\/ert\/.source\(1\)|al\\u0065rt\(1\)|top\['al\\145rt'\]\(1\)|top\['al\\x65rt'\]\(1\)|top\[8680439..toString\(30\)\]\(1\)|alert\?\(\)|`${alert``}`)\b/

    const jsEventRegex = /\bon\w+\s*=\s*['"][^'"]*['"]/gi
    if (jsEventRegex.test(input)) {
      console.error('Potential JS event attributes detected')
    }
    if (alertRegex.test(purifiedSring) && purifiedSring !== null) {
      console.error('Potential JS method detected')
    }
    if (alertObfuscation.test(purifiedSring) && purifiedSring !== null) {
      console.error('Potential JS method obfuscation detected')
    }
  }
}
