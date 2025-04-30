import { validate } from 'class-validator'
import { plainToClass } from 'class-transformer'
import { BadRequestException } from '@nestjs/common'
import { PartialType } from '@nestjs/graphql'
import UserProfile from '../../Database/Entities/userProfile.entity'

export class UserProfileDto extends PartialType(UserProfile) {}

class UserProfileValidator {
  async validate(data: any): Promise<UserProfileDto> {
    let profileData = data
    if (typeof data === 'string') {
      try {
        profileData = JSON.parse(data)
      } catch (error) {
        throw new BadRequestException('Invalid JSON format')
      }
    }

    const userProfileInstance = plainToClass(UserProfileDto, profileData)

    const errors = await validate(userProfileInstance)

    if (errors.length > 0) {
      throw new BadRequestException(errors)
    }

    return userProfileInstance
  }
}

export default UserProfileValidator
