/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ethers } from 'ethers'
import { DataSource, Repository } from 'typeorm'
import UserProfile from '../../Database/Entities/userProfile.entity'
import User from '../../Database/Entities/user.entity'
import TokenValidator from '../utils/validateToken'
import { UsersByEditArgs, UsersByIdArgs } from './user.dto'
import PaginationArgs from '../pagination.args'
import Activity from '../../Database/Entities/activity.entity'
import { queryWikisCreated, queryWikisEdited } from '../utils/queryHelpers'
import { IUser } from '../../Database/Entities/types/IUser'

@Injectable()
class UserService {
  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
    private tokenValidator: TokenValidator,
  ) {}

  private provider() {
    const apiKey = this.configService.get<string>('etherScanApiKey')
    return new ethers.providers.EtherscanProvider('mainnet', apiKey)
  }

  async userRepository(): Promise<Repository<User>> {
    return this.dataSource.getRepository(User)
  }

  async profileRepository(): Promise<Repository<UserProfile>> {
    return this.dataSource.getRepository(UserProfile)
  }

  async validateEnsAddr(
    addr: UserProfile,
    addrFromRequest: string,
  ): Promise<boolean> {
    if (addr.username?.endsWith('.eth')) {
      const address = await this.provider().resolveName(addr.username)
      if (!(address?.toLowerCase() === addrFromRequest.toLowerCase())) {
        throw new HttpException(
          'Invalid ENS, validate your ENS name or use a plain string.',
          HttpStatus.UNAUTHORIZED,
        )
      }
    }
    return true
  }

  async createProfile(
    profileInfo: string,
    token: string,
  ): Promise<UserProfile | boolean | string> {
    const data: UserProfile = JSON.parse(profileInfo)

    const id = this.tokenValidator.validateToken(token, data.id, false)

    if (
      !(await this.validateEnsAddr(data, id)) &&
      id &&
      id.toLowerCase() !== data.id.toLowerCase()
    ) {
      return false
    }
    const existsProfile = await (
      await this.profileRepository()
    ).findOneBy({
      id: data.id,
    })
    const existsUser = await (await this.userRepository())
      .createQueryBuilder()
      .where({ id: data.id })
      .getRawOne()

    const profile = (await this.profileRepository()).create({
      id: data.id,
      username: data.username,
      bio: data.bio,
      email: data.email,
      avatar: data.avatar,
      banner: data.banner,
      links: data.links,
      notifications: data.notifications,
      advancedSettings: data.advancedSettings,
    })

    const createUser = async (arg?: UserProfile) => {
      const user = (await this.userRepository()).create({
        id: data.id,
        profile: arg,
      })
      await (await this.userRepository()).save(user)
      return true
    }
    const createProfile = async () => {
      const newProfile = await (await this.profileRepository()).save(profile)
      return newProfile
    }
    const updateProfile = async () =>
      (await this.profileRepository())
        .createQueryBuilder()
        .update(UserProfile)
        .set({ ...data })
        .where('id = :id', { id: data.id })
        .execute()

    if (existsUser && existsProfile) {
      await updateProfile()

      return existsProfile
    }

    if (existsUser && !existsProfile) {
      const newProfile = await createProfile()

      await (await this.userRepository())
        .createQueryBuilder()
        .update(User)
        .set({ profile: newProfile })
        .where('LOWER(id) = :id', { id: data.id.toLowerCase() })
        .execute()
      return newProfile
    }
    if (!existsUser && existsProfile) {
      await createUser(profile)
      await updateProfile()
      return existsProfile
    }

    const newProfile = await createProfile()
    await createUser(newProfile)
    return newProfile
  }

  async getUser(id: string): Promise<User | null> {
    return (await this.userRepository())
      .createQueryBuilder('user')
      .where(`LOWER(user.id) = LOWER('${id.toLowerCase()}')`)
      .getOne()
  }

  async getUserProfile(id: string): Promise<UserProfile | null> {
    return (await this.profileRepository())
      .createQueryBuilder('user_profile')
      .where(`LOWER(id) = LOWER('${id.toLowerCase()}')`)
      .getOne()
  }

  async getUsesrById(args: UsersByIdArgs): Promise<User[] | null> {
    return (await this.userRepository())
      .createQueryBuilder()
      .where('LOWER("User".id) LIKE :id', {
        id: `%${args.id.toLowerCase()}%`,
      })
      .limit(args.limit)
      .offset(args.offset)
      .getMany()
  }

  async getUsersHidden(args: PaginationArgs): Promise<User[] | null> {
    return (await this.userRepository()).find({
      where: {
        active: false,
      },
      take: args.limit,
      skip: args.offset,
    })
  }

  async getUsersByEdits(args: UsersByEditArgs): Promise<User[] | null> {
    return (await this.userRepository())
      .createQueryBuilder('user')
      .innerJoin('activity', 'a', 'a."userId" = "user"."id"')
      .innerJoin('wiki', 'w', 'w."id" = a."wikiId"')
      .where('w."hidden" = false')
      .groupBy('"user"."id"')
      .limit(args.limit)
      .offset(args.offset)
      .getMany()
  }

  async userWikis(
    type: string,
    user: IUser,
    limit: number,
    offset: number,
  ): Promise<Activity[] | undefined> {
    const repo = this.dataSource.getRepository(Activity)
    const wikis =
      type === 'wikis created'
        ? queryWikisCreated(user, limit, offset, repo)
        : queryWikisEdited(user, limit, offset, repo)

    return wikis
  }
}

export default UserService
