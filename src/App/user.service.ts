/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ethers } from 'ethers'
import { Connection } from 'typeorm'
import UserProfile from '../Database/Entities/user_profile.entity'
import validateToken from './utils/validateToken'

@Injectable()
class UserService {
  constructor(
    private configService: ConfigService,
    private connection: Connection,
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
    return address === addrFromRequest
  }

  async createProfile(
    profileInfo: string,
    token: string,
  ): Promise<UserProfile | boolean> {
    const repository = this.connection.getRepository(UserProfile)
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

    const existsProfile = await repository.findOne(data.id)

    if (existsProfile) {
      await repository
        .createQueryBuilder()
        .update(UserProfile)
        .set({ ...data })
        .where('id = :id', { id: data.id })
        .execute()

      return existsProfile
    }

    const newProfile = repository.create({
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
    const newUser = await repository.save(newProfile)

    return newUser
  }
}

export default UserService
