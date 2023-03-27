/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ethers } from 'ethers'
import { DataSource, Repository } from 'typeorm'
import UserProfile from '../Database/Entities/userProfile.entity'
import TokenValidator from './utils/validateToken'
import User from '../Database/Entities/user.entity'

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
}

export default UserService
