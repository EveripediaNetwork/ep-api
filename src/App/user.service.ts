/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import UserProfile from '../Database/Entities/user_profile.entity'
import validateToken from './utils/validateToken'

@Injectable()
class UserService {
  constructor(private connection: Connection) {}

  async createProfile(
    profileInfo: string,
    token: string,
  ): Promise<UserProfile | boolean> {
    const data: UserProfile = JSON.parse(profileInfo)
    const repository = this.connection.getRepository(UserProfile)

    const id = validateToken(token) 

    if (id === 'Token expired' || id.toLowerCase() !== data.id.toLowerCase())
      throw new HttpException('Unathorized', HttpStatus.UNAUTHORIZED)

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
