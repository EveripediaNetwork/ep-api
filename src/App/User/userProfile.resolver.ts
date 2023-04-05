import { UseGuards } from '@nestjs/common'
import {
  Args,
  ArgsType,
  Context,
  Directive,
  Field,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { Validate } from 'class-validator'
import { DataSource } from 'typeorm'
import Activity from '../../Database/Entities/activity.entity'
import UserProfile from '../../Database/Entities/userProfile.entity'
import Wiki from '../../Database/Entities/wiki.entity'
import PaginationArgs from '../pagination.args'
import UserService from './user.service'
import ValidStringParams from '../utils/customValidator'
import IsActiveGuard from '../utils/isActive.guard'
import { queryWikisCreated, queryWikisEdited } from '../utils/queryHelpers'

@ArgsType()
class GetProfileArgs {
  @Field({ nullable: true })
  @Validate(ValidStringParams)
  id?: string

  @Field({ nullable: true })
  @Validate(ValidStringParams)
  username?: string
}

@Resolver(() => UserProfile)
class UserProfileResolver {
  constructor(
    private dataSource: DataSource,
    private userService: UserService,
  ) {}

  @Query(() => UserProfile, { nullable: true })
  async getProfile(@Args() args: GetProfileArgs) {
    const profile = await (
      await this.userService.profileRepository()
    )
      .createQueryBuilder('user')
      .where(
        `LOWER(id) = '${args.id?.toLowerCase()}' OR LOWER(username) = '${args.username?.toLowerCase()}'`,
      )
      .getOne()
    return profile || null
  }

  @Query(() => [UserProfile])
  async getProfileLikeUsername(@Args() args: GetProfileArgs) {
    return (await this.userService.profileRepository())
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
    const name = await (
      await this.userService.profileRepository()
    ).find({
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
    const repo = this.dataSource.getRepository(Activity)
    return queryWikisCreated(user, args.limit, args.offset, repo)
  }

  @ResolveField()
  async wikisEdited(
    @Parent() user: GetProfileArgs,
    @Args() args: PaginationArgs,
  ) {
    const repo = this.dataSource.getRepository(Activity)
    return queryWikisEdited(user, args.limit, args.offset, repo)
  }

  @ResolveField()
  async active(@Parent() user: GetProfileArgs) {
    const { id } = user
    const a = await (
      await this.userService.userRepository()
    ).query(`SELECT u."active" 
        FROM "user_profile"
        LEFT JOIN "user" u on u."id" = "user_profile"."id"
        WHERE "user_profile"."id" = '${id}'`)
    return a[0].active
  }

  @ResolveField(() => [Wiki], { nullable: true })
  @Directive('@isUser')
  async wikiSubscriptions(@Parent() user: GetProfileArgs) {
    const wikiRepo = this.dataSource.getRepository(Wiki)
    const { id } = user
    const subs = await wikiRepo.query(`
        SELECT wiki.* FROM wiki
        LEFT JOIN "subscription" s on s."auxiliaryId" = wiki.id
        WHERE LOWER(s."userId") = '${id?.toLowerCase()}' AND s."notificationType" = 'wiki' 
    `)
    return subs
  }
}

export default UserProfileResolver
