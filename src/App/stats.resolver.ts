/* eslint-disable max-classes-per-file */
import { CACHE_MANAGER, Inject, UseInterceptors } from '@nestjs/common'
import {
  Args,
  ArgsType,
  Field,
  Int,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql'
import { Connection } from 'typeorm'
import { Cache } from 'cache-manager'
import { Validate } from 'class-validator'
import Activity from '../Database/Entities/activity.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import Tag from '../Database/Entities/tag.entity'
import Wiki from '../Database/Entities/wiki.entity'
import { CategoryArgs } from './wiki.dto'
import ValidStringParams from './utils/customValidator'

@ObjectType()
export class Count {
  @Field(() => Int)
  amount!: number
}

@ObjectType()
export class WikiStats extends Count {
  @Field()
  startOn!: Date

  @Field()
  endOn!: Date
}

@ObjectType()
export class WikiUserStats extends Count {
  @Field()
  @Validate(ValidStringParams)
  address!: string
}

@ArgsType()
class DateArgs {
  @Field(() => Int)
  startDate = Math.round(new Date().setDate(new Date().getDate() - 7) / 1000)

  @Field(() => Int)
  endDate = Math.round(Date.now() / 1000)
}

@ArgsType()
class IntervalArgs extends DateArgs {
  @Field(() => String)
  interval = 'hour'
}

@ArgsType()
class UserArgs extends DateArgs {
  @Field(() => String)
  userId!: string
}

@UseInterceptors(SentryInterceptor)
@Resolver(() => Activity)
class StatsResolver {
  constructor(
    private connection: Connection,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Query(() => [WikiStats])
  async wikisCreated(@Args() args: IntervalArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select(`Count(*)`, 'amount')
      .addSelect('Min(datetime)', 'startOn')
      .addSelect('Max(datetime)', 'endOn')
      .addSelect(`date_trunc('${args.interval}', datetime) AS interval`)
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false AND type = '0'`)
      .andWhere(
        `activity.datetime >= to_timestamp(${args.startDate}) AND activity.datetime <= to_timestamp(${args.endDate})`,
      )
      .groupBy('interval')
      .orderBy('Min(datetime)', 'ASC')
      .getRawMany()
    return response
  }

  @Query(() => [WikiStats])
  async wikisEdited(@Args() args: IntervalArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select(`Count(*)`, 'amount')
      .addSelect('Min(datetime)', 'startOn')
      .addSelect('Max(datetime)', 'endOn')
      .addSelect(`date_trunc('${args.interval}', datetime) AS interval`)
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false AND type = '1'`)
      .andWhere(
        `activity.datetime >= to_timestamp(${args.startDate}) AND activity.datetime <= to_timestamp(${args.endDate})`,
      )
      .groupBy('interval')
      .orderBy('Min(datetime)', 'ASC')
      .getRawMany()
    return response
  }

  @Query(() => WikiUserStats)
  async wikisCreatedByUser(@Args() args: UserArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select('activity.userId', 'address')
      .addSelect(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(${args.startDate}) AND activity.datetime <= to_timestamp(${args.endDate}))`,
        'amount',
      )
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        `LOWER(activity.userId) = '${args.userId.toLowerCase()}' AND w."hidden" = false AND type = '0'`,
      )
      .groupBy('activity.userId')
      .getRawOne()
    return response
  }

  @Query(() => WikiUserStats)
  async wikisEditedByUser(@Args() args: UserArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select('activity.userId', 'address')
      .addSelect(
        `Count(*) FILTER(WHERE activity.datetime >= to_timestamp(${args.startDate}) AND activity.datetime <= to_timestamp(${args.endDate}))`,
        'amount',
      )
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(
        `LOWER(activity.userId) = '${args.userId.toLowerCase()}' AND w."hidden" = false AND type = '1'`,
      )
      .groupBy('activity.userId')
      .getRawOne()
    return response
  }

  @Query(() => Count)
  async editorCount(@Args() args: DateArgs) {
    const repository = this.connection.getRepository(Activity)
    const response = await repository
      .createQueryBuilder('activity')
      .select(`Count(distinct activity."userId")`, 'amount')
      .leftJoin('wiki', 'w', 'w."id" = activity.wikiId')
      .where(`w."hidden" = false`)
      .andWhere(
        `activity.datetime >= to_timestamp(${args.startDate}) AND activity.datetime <= to_timestamp(${args.endDate})`,
      )
      .getRawOne()
    return response
  }

  @Query(() => Count)
  async pageViewsCount(@Args() args: DateArgs) {
    const repository = this.connection.getRepository(Wiki)
    const response = await repository
      .createQueryBuilder('wiki')
      .select(`Sum("views")`, 'amount')
      .where(
        `wiki.updated >= to_timestamp(${args.startDate}) AND wiki.updated <= to_timestamp(${args.endDate})`,
      )
      .getRawOne()
    return response
  }

  @Query(() => [Tag])
  async tagsPopular(@Args() args: DateArgs) {
    const repository = this.connection.getRepository(Tag)
    return repository.query(
      `
        SELECT "tagId" as id, COUNT(*) AS amount
        FROM public.wiki_tags_tag tags
        INNER JOIN wiki w ON w.id  = tags."wikiId"
        WHERE w.updated >= to_timestamp(${args.startDate}) AND w.updated <= to_timestamp(${args.endDate})
        GROUP BY "tagId" 
        ORDER BY amount DESC 
        LIMIT 15       
        `,
    )
  }

  @Query(() => Count)
  async categoryTotal(@Args() args: CategoryArgs) {
    const count: any | undefined = await this.cacheManager.get(args.category)
    if (count) return count
    const repository = this.connection.getRepository(Wiki)
    const response = await repository
      .createQueryBuilder('wiki')
      .select(`Count(wiki.id)`, 'amount')
      .innerJoin('wiki_categories_category', 'wc', 'wc."wikiId" = wiki.id')
      .innerJoin(
        'category',
        'c',
        `c.id = wc."categoryId" AND c.id = '${args.category}' `,
      )
      .where('wiki.hidden = false')
      .getRawOne()
    await this.cacheManager.set(args.category, response, { ttl: 3600 })
    return response
  }
}

export default StatsResolver
