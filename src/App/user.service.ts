/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import * as Web3Token from 'web3-token'
import User from '../Database/Entities/user.entity'
import UserProfile from '../Database/Entities/user_profile.entity'

@Injectable()
class UserService {
  constructor(private connection?: Connection) {}

  async validateToken(token: string): Promise<string> {
    let addres
    try {
      const { address } = await Web3Token.verify(
        'eyJzaWduYXR1cmUiOiIweGYyMTFlMDhiYWEwMjU5MDRhNDYyNGI4MGNmMWNjOTFiOGZkZTQ5ZTY5YmUzNzJjNmZmZGNjOWE3NTVmOTI1MzM2ZmU1ODY4YmQ0ZWU2OWMyNjBkYmNiMWI5ODFkNDA1ZmZmM2Q2ZjRkMWViNjcwMTFhOTRiZTZhMTY4NTk2MWY5MWMiLCJib2R5IjoiV2VsY29tZSB0byBFdmVyaXBlZGlhICEgQ2xpY2sgdG8gc2lnbiBpbiBhbmQgYWNjZXB0IHRoZSBFdmVyaXBlZGlhIFRlcm1zIG9mIFNlcnZpY2U6IGh0dHBzOi8vZXZlcmlwZWRpYS5jb20vc3RhdGljL3Rlcm1zLiBUaGlzIHJlcXVlc3Qgd2lsbCBub3QgdHJpZ2dlciBhIGJsb2NrY2hhaW4gdHJhbnNhY3Rpb24gb3IgY29zdCBhbnkgZ2FzIGZlZXMuIFlvdXIgYXV0aGVudGljYXRpb24gc3RhdHVzIHdpbGwgcmVzZXQgYWZ0ZXIgMSBob3Vycy4gXG5cblVSSTogaHR0cDovL2xvY2FsaG9zdDo0MDAwL2FjY291bnQvc2V0dGluZ3NcbldlYjMgVG9rZW4gVmVyc2lvbjogMlxuTm9uY2U6IDY0OTkxNTQ0XG5Jc3N1ZWQgQXQ6IDIwMjItMDYtMjdUMTU6NTU6MDkuMzU3WlxuRXhwaXJhdGlvbiBUaW1lOiAyMDIyLTA2LTI3VDE2OjU1OjA5LjAwMFoifQ==',
      )
      addres = address
    } catch (e: any) {
      return e as string
    }
    return addres
  }

  async validateUser(token: string): Promise<boolean> {
    const repository = this.connection?.getRepository(User)

    const id = await this.validateToken(token)

    if (id !== typeof String) return false

    const user = await repository?.findOneOrFail({
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
    const repository = this.connection?.getRepository(UserProfile)
    let newUser
    if (await this.validateUser(token)) {
      const newProfile = repository?.create({
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
      //   newUser = await repository?.save(newProfile)
    }
    return newUser
  }
}

export default UserService
