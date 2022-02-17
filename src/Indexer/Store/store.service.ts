import { Injectable } from '@nestjs/common'

@Injectable()
class DBStoreService {
  storeWiki(wiki: Record<string, unknown>): boolean {
    // TODO: get an object runs validation and store it in db
    console.log(wiki)
    return true
  }
}

export default DBStoreService
