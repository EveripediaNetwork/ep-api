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
  async activities(@Args() args: LangArgs) {
    const repository = this.connection.getRepository(Activity)
    return repository
      .createQueryBuilder('activity')
      .where(`content @> '[{"language" : {"id": "${args.lang}"}}]'`)
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()
  }

  @Query(() => [Activity])
  async activitiesInHr(@Args() args: ActivityArgs) {
    const repository = this.connection.getRepository(Activity)
    return repository
      .createQueryBuilder('activity')
      .where(
        `activity.wikiId = :id AND activity.datetime >= NOW() - INTERVAL '1 HOURS'`,
        {
          id: args.wikiId,
        },
      )
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('datetime', 'DESC')
      .getMany()
  }

  @Query(() => [Activity])
  async activitiesByWikId(@Args() args: ActivityArgs) {
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
