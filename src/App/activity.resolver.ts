import { Args, ArgsType, Field, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import Activity from '../Database/Entities/activity.entity'
import PaginationArgs from './pagination.args'

@ArgsType()
class ActivityArgs extends PaginationArgs {
  @Field(() => String)
  wikiId!: string
}

@Resolver(() => Activity)
class ActivityResolver {
  constructor(private connection: Connection) {}

  @Query(() => [Activity])
  async Activities(@Args() args: PaginationArgs) {
    const repository = this.connection.getRepository(Activity)
    return repository.find({
      take: args.limit,
      skip: args.offset,
      order: {
        datetime: 'DESC',
      },
      
    })
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
