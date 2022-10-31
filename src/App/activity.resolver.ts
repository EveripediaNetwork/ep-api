import { UseInterceptors } from '@nestjs/common'
import {
  Args,
  ArgsType,
  Field,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Activity from '../Database/Entities/activity.entity'
import { Author } from '../Database/Entities/types/IUser'
import { IWiki } from '../Database/Entities/types/IWiki'
import SentryInterceptor from '../sentry/security.interceptor'
import PaginationArgs from './pagination.args'

@ArgsType()
class ActivityArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  wikiId!: string

  @Field(() => String)
  lang = 'en'
}

@ArgsType()
class ActivityArgsByUser extends PaginationArgs {
  @Field(() => String)
  userId!: string
}

@ArgsType()
class ByIdAndBlockArgs extends ActivityArgs {
  @Field(() => Int)
  block!: number
}

@UseInterceptors(SentryInterceptor)
@Resolver(() => Activity)
class ActivityResolver {
  constructor(private connection: Connection) {}

  @Query(() => [Activity])
  async activities(@Args() args: ActivityArgs) {
    const repository = this.connection.getRepository(Activity)
    return repository.find({
      relations: ['wiki'],
      where: {
        language: args.lang,
        wiki: {
          hidden: false,
        },
      },
      take: args.limit,
      skip: args.offset,
      order: {
        datetime: 'DESC',
      },
    })
  }

  @Query(() => [Activity])
  async activitiesByWikId(@Args() args: ActivityArgs) {
    const repository = this.connection.getRepository(Activity)
    return repository.find({
      relations: ['wiki'],
      where: {
        wiki: {
          id: args.wikiId,
          hidden: false,
        },
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
      relations: ['wiki'],
      where: {
        user: args.userId,
        wiki: {
          hidden: false,
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
    return repository.findOne({
      relations: ['wiki'],
      where: {
        id,
        wiki: {
          hidden: false,
        },
      },
    })
  }

  @Query(() => Activity)
  async activityByWikiIdAndBlock(@Args() args: ByIdAndBlockArgs) {
    const repository = this.connection.getRepository(Activity)
    return repository.findOne({
      relations: ['wiki'],
      where: {
        language: args.lang,
        wiki: {
          id: args.wikiId,
          hidden: false,
        },
      },
    })
  }

  @ResolveField(() => Author)
  async author(@Parent() wiki: IWiki) {
    const { id } = wiki
    const repository = this.connection.getRepository(Activity)
    const res = await repository.query(`SELECT "userId", u.* 
        FROM activity
        LEFT JOIN "user_profile" u ON u."id" = "userId"
        WHERE "id" = '${id}' AND "type" = '0'`)
    return { id: res[0]?.userId, profile: { ...res[0] } || null }
  }
}

export default ActivityResolver
