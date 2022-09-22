/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ethers } from 'ethers'
import { Connection } from 'typeorm'
import UserProfile from '../Database/Entities/userProfile.entity'
import validateToken from './utils/validateToken'
import User from '../Database/Entities/user.entity'
import {
  RevalidateEndpoints,
  RevalidatePageService,
} from './revalidatePage/revalidatePage.service'

@Injectable()
class UserService {
  constructor(
    private configService: ConfigService,
    private connection: Connection,
    private revalidate: RevalidatePageService,
  ) {}

  private provider() {
    const apiKey = this.configService.get<string>('etherScanApiKey')
    return new ethers.providers.EtherscanProvider('mainnet', apiKey)
  }

  async validateEnsAddr(
    addr: string,
    addrFromRequest: string,
  ): Promise<boolean> {
    const address = await this.provider().resolveName(addr)
    return address?.toLowerCase() === addrFromRequest.toLowerCase()
  }

  async createProfile(
    profileInfo: string,
    token: string,
  ): Promise<UserProfile | boolean> {
    const profileRepository = this.connection.getRepository(UserProfile)
    const userRepository = this.connection.getRepository(User)
    const data: UserProfile = JSON.parse(profileInfo)

    const id = validateToken(token)

    if (id === 'Token expired' || id.toLowerCase() !== data.id.toLowerCase())
      throw new HttpException('Unathorized', HttpStatus.UNAUTHORIZED)

    if (data.username?.endsWith('.eth')) {
      const validEns = await this.validateEnsAddr(data.username, id)
      if (!validEns) {
        throw new HttpException(
          'Invalid ENS, validate your ENS name or use a plain string.',
          HttpStatus.UNAUTHORIZED,
        )
      }
    }

    const existsProfile = await profileRepository.findOne(data.id)
    const existsUser = await userRepository
      .createQueryBuilder()
      .where({ id: data.id })
      .getRawOne()

    if (existsProfile && existsUser.User_profileId !== null) {
      await profileRepository
        .createQueryBuilder()
        .update(UserProfile)
        .set({ ...data })
        .where('id = :id', { id: data.id })
        .execute()

      await this.revalidate.revalidatePage(
        RevalidateEndpoints.CREATE_PROFILE,
        data.id,
      )
      return existsProfile
    }

    const createProfile = profileRepository.create({
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

    const newProfile = await profileRepository.save(createProfile)

    if (existsUser && existsUser.User_profileId === null) {
      await userRepository
        .createQueryBuilder()
        .update(User)
        .set({ profile: newProfile })
        .where('LOWER(id) = :id', { id: data.id.toLowerCase() })
        .execute()

      await this.revalidate.revalidatePage(
        RevalidateEndpoints.CREATE_PROFILE,
        data.id,
      )
    }

    const createUser = userRepository.create({
      id: data.id,
      profile: newProfile,
    })

    await userRepository.save(createUser)
    await this.revalidate.revalidatePage(RevalidateEndpoints.CREATE_PROFILE, data.id)
    return newProfile
  }
}

export default UserService
