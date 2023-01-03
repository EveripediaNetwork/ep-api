/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import TokenValidator from './utils/validateToken'
import Wiki from '../Database/Entities/wiki.entity'

@Injectable()
class WikiService {
  constructor(private connection: Connection) {}

  async wikisIds() {
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      select: ['id'],
      where: {
        hidden: false,
      },
    })
  }
}

export default WikiService
