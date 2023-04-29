/* eslint-disable no-template-curly-in-string */
import { Injectable } from '@nestjs/common'
import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const { window } = new JSDOM('')
const DOMPurify = createDOMPurify(window)

@Injectable()
export class SecurityTestingService {
  private sanitizeInput(input: string) {
    return DOMPurify.sanitize(input)
  }

  async findCharsNotPurified(input: string) {
    const purifiedSring = this.sanitizeInput(input)
    const alertRegex = /alert\([\s\S]*?\)/

    if (alertRegex.test(purifiedSring)) {
      console.error('Potential JS command detected')
    }
  }
}

export default SecurityTestingService
