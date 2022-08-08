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
  async getProfile(
    @Args('id', { type: () => String, nullable: true })
    id: string,
    @Args('username', { type: () => String, nullable: true })
    username: string,
  ) {
    const repository = this.connection.getRepository(UserProfile)
    return repository.findOneOrFail({
      where: `LOWER(id) = '${id?.toLowerCase()}' OR LOWER(username) = '${username?.toLowerCase()}'`,
    })
  }

  @Query(() => [UserProfile])
  async getProfileLikeUsername(
    @Args('id', { type: () => String, nullable: true })
    id: string,
    @Args('username', { type: () => String, nullable: true })
    username: string,
  ) {
    const repository = this.connection.getRepository(UserProfile)
    return repository
      .createQueryBuilder('user_profile')
      .where('LOWER(username) LIKE :username', {
        username: `%${username?.toLowerCase()}%`,
      })
      .orWhere('LOWER(id) LIKE :id', {
        id: `%${id?.toLowerCase()}%`,
      })
      .getMany()
  }

  @Mutation(() => UserProfile, { name: 'createProfile' })
  async createProfile(
    @Args({ name: 'profileInfo', type: () => String }) profileInfo: string,
    @Context() context: any,
  ) {
    const { authorization } = context.req.headers

    return this.userService.createProfile(profileInfo, authorization)
  }

  @Query(() => Boolean)
  async usernameTaken(@Args('username') username: string) {
    const repository = this.connection.getRepository(UserProfile)
    const name = await repository.find({
      select: ['username'],
      where: { username },
    })
    return name[0]?.username === username
  }
}

export default UserProfileResolver
