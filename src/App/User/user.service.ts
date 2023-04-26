/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ethers } from 'ethers'
import {
  DataSource,
  Entity,
  EntityTarget,
  Repository,
  getMetadataArgsStorage,
} from 'typeorm'
import { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs'
import UserProfile from '../../Database/Entities/userProfile.entity'
import User from '../../Database/Entities/user.entity'
import TokenValidator from '../utils/validateToken'
import { UsersByEditArgs, UsersByIdArgs } from './user.dto'
import PaginationArgs from '../pagination.args'
import Activity from '../../Database/Entities/activity.entity'
import { queryWikisCreated, queryWikisEdited } from '../utils/queryHelpers'

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
    const existsUser = await (
      await this.userRepository()
    )
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

      await (
        await this.userRepository()
      )
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

  async getAllColumnNames(
    entity: EntityTarget<any>,
    fields: string[],
    tableName: string,
  ): Promise<string[]> {
    const userTable = this.dataSource.getMetadata(entity)

    if (!userTable || !userTable.columns.length) {
      return []
    }

    const columnNames = userTable.columns.map((column) => column.propertyName)
    const columns = columnNames.filter((e) => fields.includes(e))
    const fieldsWithPrefix = columns.map((field) => {
      if (!columns.includes('id')) {
        return `${tableName}.id`
      }
      return `${tableName}.${field}`
    })

    return fieldsWithPrefix
  }

  async getUser(id: string, fields: string[]): Promise<User | null> {
    const fieldsWithPrefix = await this.getAllColumnNames(User, fields, 'user')
    return (await this.userRepository())
      .createQueryBuilder('user')
      .select([...fieldsWithPrefix])
      .where('LOWER(id) = :id', { id: id.toLowerCase() })
      .getOne()
  }

  async getUserProfile(
    fields: string[],
    id?: string,
    username?: string,
    users = false,
  ): Promise<UserProfile | UserProfile[] | null> {
    const fieldsWithPrefix = await this.getAllColumnNames(
      UserProfile,
      fields,
      'user_profile',
    )
    console.log(fieldsWithPrefix)
    const profile = (await this.profileRepository())
      .createQueryBuilder('user_profile')
      .select([...fieldsWithPrefix])
      .where('LOWER(id) = :id', { id: id?.toLowerCase() })

    if (!id) {
      profile.orWhere('LOWER(username) LIKE :username', {
        username: `%${username?.toLowerCase()}%`,
      })
    }
    return users ? profile.getMany() : profile.getOne()
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
    id: string,
    limit: number,
    offset: number,
  ): Promise<Activity[] | undefined> {
    const repo = this.dataSource.getRepository(Activity)
    const wikis =
      type === 'wikis created'
        ? queryWikisCreated(id, limit, offset, repo)
        : queryWikisEdited(id, limit, offset, repo)

    return wikis
  }
}

export default UserService
