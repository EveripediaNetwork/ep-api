import { UseInterceptors } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import UserProfile from '../Database/Entities/user_profile.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import UserService from './user.service'

@UseInterceptors(SentryInterceptor)
@Resolver(() => UserProfile)
class UserProfileResolver {
  constructor(
    private connection: Connection,
    private userService: UserService,
  ) {}

  @Query(() => UserProfile)
  async getProfile(@Args('id', { type: () => String }) id: string) {
    const repository = this.connection.getRepository(UserProfile)
    return repository.findOneOrFail({
      where: `LOWER(id) = '${id.toLowerCase()}'`,
    })
  }

  @Mutation(() => UserProfile, { name: 'createProfile' })
  async createProfile(
    @Args({ name: 'profileInfo', type: () => String }) profileInfo: string,
    @Context() context: any,
  ) {
    const { authorization } = context.req.headers

    return this.userService.createProfile(profileInfo, authorization)
  }
}

export default UserProfileResolver
