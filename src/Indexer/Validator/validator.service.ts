import { Injectable } from '@nestjs/common'

@Injectable()
class IPFSValidatorService {
  validate(wiki: Record<string, unknown>): boolean {
    // TODO: check object integrity related to the version
    // TODO: check valid slug
    // TODO: check user == user who signed
    return true
  }
}

export default IPFSValidatorService
