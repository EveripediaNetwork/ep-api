import { Injectable } from '@nestjs/common'

@Injectable()
class IPFSValidatorService {
  validate(wiki: Record<string, unknown>): boolean {
    // TODO: check object integrity related to the version
    return true
  }
}

export default IPFSValidatorService
