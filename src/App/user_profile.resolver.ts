import { UseInterceptors } from '@nestjs/common'
import { Args, Context, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import UserProfile from '../Database/Entities/user_profile.entity'
import SentryInterceptor from '../sentry/security.interceptor'

@UseInterceptors(SentryInterceptor)
@Resolver(() => UserProfile)
class UserProfileResolver {
  constructor(private connection: Connection) {}

  @Query(() => UserProfile)
  async profile(
    @Args('id', { type: () => String }) id: string,
    @Context() context: any,
  ) {
    console.log(context.req.headers)
    const repository = this.connection.getRepository(UserProfile)
    return repository.findOne({
      where: `LOWER(id) = '${id.toLowerCase()}'`,
    })
  }
}

export default UserProfileResolver
