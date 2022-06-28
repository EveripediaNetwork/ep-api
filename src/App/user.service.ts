/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import * as Web3Token from 'web3-token'
import User from '../Database/Entities/user.entity'
import UserProfile from '../Database/Entities/user_profile.entity'

@Injectable()
class UserService {
  constructor(readonly connection: Connection) {}

  async validateToken(token: string): Promise<string | void> {
      const { address } = Web3Token.verify(token)
    return address
  }

 async validateUser(token: string): Promise<boolean> {
    const repository = this.connection.getRepository(User)
    const id = await this.validateToken(token)
    const user = await repository.findOneOrFail({
      where: `LOWER(id) = '${id?.toLowerCase()}'`,
    })
    if (user) return true
    return false
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
