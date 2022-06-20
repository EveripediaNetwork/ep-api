import { UseInterceptors } from '@nestjs/common'
import { Args, ArgsType, Field, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Activity from '../Database/Entities/activity.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import PaginationArgs from './pagination.args'

@ArgsType()
class ActivityArgs extends PaginationArgs {
  @Field(() => String)
  wikiId!: string
}

@ArgsType()
class ActivityArgsByUser extends PaginationArgs {
  @Field(() => String)
  userId!: string
}

@ArgsType()
class LangArgs extends PaginationArgs {
  @Field(() => String)
  lang = 'en'
}

@UseInterceptors(SentryInterceptor)
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

  @Query(() => [Activity])
  async activitiesByUser(@Args() args: ActivityArgsByUser) {
    const repository = this.connection.getRepository(Activity)

    return repository.find({
      where: {
        user: {
          id: args.userId,
        },
      },
      take: args.limit,
      skip: args.offset,
      order: {
        datetime: 'DESC',
      },
    })
  }

  @Query(() => Activity)
  async activityById(@Args('id', { type: () => String }) id: string) {
    const repository = this.connection.getRepository(Activity)
    return repository.findOneOrFail(id)
  }
}

export default ActivityResolver
