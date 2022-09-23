import { HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common'
import {
  Args,
  ArgsType,
  Context,
  Field,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { Connection } from 'typeorm'
import UserProfile from '../Database/Entities/userProfile.entity'
import SentryInterceptor from '../sentry/security.interceptor'
import { GqlError, ErrorTypes } from './errorHandling/errorHandler'
import PaginationArgs from './pagination.args'
import UserService from './user.service'
import IsActiveGuard from './utils/isActive.guard'
import { queryWikisCreated, queryWikisEdited } from './utils/queryHelpers'

@ArgsType()
class GetProfileArgs {
  @Field({ nullable: true })
  id?: string

  @Field({ nullable: true })
  username?: string
}

@UseInterceptors(SentryInterceptor)
@Resolver(() => UserProfile)
class UserProfileResolver {
  constructor(
    private connection: Connection,
    private userService: UserService,
  ) {}

  @Query(() => UserProfile)
  @UseGuards(IsActiveGuard)
  async getProfile(@Args() args: GetProfileArgs) {
    const repository = this.connection.getRepository(UserProfile)
    const profile = await repository.findOne({
      where: `LOWER(id) = '${args.id?.toLowerCase()}' OR LOWER(username) = '${args.username?.toLowerCase()}'`,
    })

    if (!profile) {
      throw new GqlError(
        HttpStatus.NOT_FOUND,
        'User profile does not exist',
        ErrorTypes.NOT_FOUND,
      )
    }
    return profile
  }

  @Query(() => [UserProfile])
  async getProfileLikeUsername(@Args() args: GetProfileArgs) {
    const repository = this.connection.getRepository(UserProfile)
    return repository
      .createQueryBuilder('user_profile')
      .where('LOWER(username) LIKE :username', {
        username: `%${args.username?.toLowerCase()}%`,
      })
      .orWhere('LOWER(id) LIKE :id', {
        id: `%${args.id?.toLowerCase()}%`,
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
  async wikisCreated(
    @Parent() user: GetProfileArgs,
    @Args() args: PaginationArgs,
  ) {
    return queryWikisCreated(user, args.limit, args.offset)
  }

  @ResolveField()
  async wikisEdited(
    @Parent() user: GetProfileArgs,
    @Args() args: PaginationArgs,
  ) {
    return queryWikisEdited(user, args.limit, args.offset)
  }

  @ResolveField()
  async active(@Parent() user: GetProfileArgs) {
    const { id } = user
    const repository = this.connection.getRepository(UserProfile)
    const a = await repository.query(`SELECT u."active" 
        FROM "user_profile"
        LEFT JOIN "user" u on u."id" = "user_profile"."id"
        WHERE "user_profile"."id" = '${id}'`)
    return a[0].active
  }
}

export default UserProfileResolver
