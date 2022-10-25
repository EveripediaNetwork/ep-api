/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ethers } from 'ethers'
import { Connection } from 'typeorm'
import UserProfile from '../Database/Entities/userProfile.entity'
import TokenValidator from './utils/validateToken'
import User from '../Database/Entities/user.entity'

@Injectable()
class UserService {
  constructor(
    private configService: ConfigService,
    private connection: Connection,
    private tokenValidator: TokenValidator,
  ) {}

  private provider() {
    const apiKey = this.configService.get<string>('etherScanApiKey')
    return new ethers.providers.EtherscanProvider('mainnet', apiKey)
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
    const profileRepository = this.connection.getRepository(UserProfile)
    const userRepository = this.connection.getRepository(User)
    const data: UserProfile = JSON.parse(profileInfo)

    const id = this.tokenValidator.validateToken(token, data.id, false)

    if (
      (await this.validateEnsAddr(data, id)) &&
      !(id?.toLowerCase() !== data.id.toLowerCase())
    ) {
      const existsProfile = await profileRepository.findOne(data.id)
      const existsUser = await userRepository
        .createQueryBuilder()
        .where({ id: data.id })
        .getRawOne()

      const profile = profileRepository.create({
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
        const user = userRepository.create({ id: data.id, profile: arg })
        await userRepository.save(user)
        return true
      }
      const createProfile = async () => {
        const newProfile = await profileRepository.save(profile)
        return newProfile
      }
      const updateProfile = async () =>
        profileRepository
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
        userRepository
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
    return true
  }
}

export default UserService
