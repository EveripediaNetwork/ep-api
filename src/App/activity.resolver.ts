import { Args, ArgsType, Field, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Activity from '../Database/Entities/activity.entity'
import PaginationArgs from './pagination.args'

@ArgsType()
class ActivityArgs extends PaginationArgs {
  @Field(() => String)
  wikiId!: string
}

@ArgsType()
class LangArgs extends PaginationArgs {
  @Field(() => String)
  lang = 'en'
}

@Resolver(() => Activity)
class ActivityResolver {
  constructor(private connection: Connection) {}

  @Query(() => [Activity])
  async Activities(@Args() args: LangArgs) {
    const repository = this.connection.getRepository(Activity)
    return repository
      .createQueryBuilder('activity')
      .where(`content[0] ::jsonb @> '{"language":{"id":"${args.lang}"}} '`)
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()
  }

  @Query(() => [Activity])
  async ActivitiesByWikId(@Args() args: ActivityArgs) {
    const repository = this.connection.getRepository(Activity)
    return repository.find({
      where: {
        wikiId: args.wikiId,
      },
      take: args.limit,
      skip: args.offset,
      order: {
        datetime: 'DESC',
      },
    })
  }
}

export default ActivityResolver
