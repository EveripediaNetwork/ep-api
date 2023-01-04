/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'

@Injectable()
class WikiService {
  constructor(private connection: Connection) {}

  async wikisIds() {
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      select: ['id', 'updated'],
      where: {
        hidden: false,
      },
    })
  }
}

export default WikiService
