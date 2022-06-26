/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import * as Web3Token from 'web3-token'
import UserProfile from '../Database/Entities/user_profile.entity'

@Injectable()
class UserService {
  constructor(private connection: Connection) {}

  async validateUser(token: string): Promise<boolean> {
    const { address, body } = Web3Token.verify(token)
    return true
  }

  async createProfile(
    profileInfo: string,
    token: string,
  ): Promise<UserProfile | any> {
    const data: UserProfile = JSON.parse(profileInfo)
    const repository = this.connection.getRepository(UserProfile)
    let newUser
    if (await this.validateUser(token)) {
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
      newUser = await repository.save(newProfile)
    }
    return newUser
  }
}

export default UserService
