import { Injectable } from '@nestjs/common'
import { Connection, Repository } from 'typeorm'
import Wiki from '../Database/Entities/wiki.entity'
import { orderWikis, OrderBy, Direction } from './utils/queryHelpers'
import { ByIdArgs, LangArgs } from './wiki.dto'

@Injectable()
class WikiService {
  constructor(private connection: Connection) {}

  async repository(): Promise<Repository<Wiki>> {
    return this.connection.getRepository(Wiki)
  }

  async wikisIds() {
    return (await this.repository()).find({
      select: ['id', 'updated'],
      where: {
        hidden: false,
      },
    })
  }

  async findWiki(args: ByIdArgs): Promise<Wiki | undefined> {
    return (await this.repository()).findOne({
      where: {
        language: args.lang,
        id: args.id,
      },
    })
  }

  async getWikis(args: LangArgs): Promise<Wiki[] | []> {
    return (await this.repository()).find({
      where: {
        language: args.lang,
        hidden: false,
      },
      take: args.limit,
      skip: args.offset,
      order: orderWikis(args.order as OrderBy, args.direction as Direction),
    })
  }
}

export default WikiService
