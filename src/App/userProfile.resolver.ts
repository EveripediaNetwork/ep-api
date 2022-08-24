import { UseGuards, UseInterceptors } from '@nestjs/common'
import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { Connection } from 'typeorm'
import { IUser } from '../Database/Entities/types/IUser'
import UserProfile from '../Database/Entities/userProfile.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import PaginationArgs from './pagination.args'
import UserService from './user.service'
import IsActiveGuard from './utils/isActive.guard'
import { queryWikisCreated, queryWikisEdited } from './utils/queryHelpers'

@UseInterceptors(SentryInterceptor)
@Resolver(() => UserProfile)
class UserProfileResolver {
  constructor(
    private connection: Connection,
    private userService: UserService,
  ) {}

  @Query(() => UserProfile)
  @UseGuards(IsActiveGuard)
  async getProfile(
    @Args('id', { type: () => String, nullable: true })
    id: string,
    @Args('username', { type: () => String, nullable: true })
    username: string,
  ) {
    const repository = this.connection.getRepository(UserProfile)
    return repository.findOne({
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
  @UseGuards(IsActiveGuard)
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

  @ResolveField()
  async wikisCreated(@Parent() user: IUser, @Args() args: PaginationArgs) {
    queryWikisCreated(user, args.limit, args.offset)
  }

  @ResolveField()
  async wikisEdited(@Parent() user: IUser, @Args() args: PaginationArgs) {
    queryWikisEdited(user, args.limit, args.offset)
  }
}

export default UserProfileResolver
