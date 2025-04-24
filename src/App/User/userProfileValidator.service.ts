import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  validate,
  ValidateNested,
} from 'class-validator'
import { plainToClass, Type } from 'class-transformer'
import { BadRequestException } from '@nestjs/common'
import { Links } from '../../Database/Entities/types/IUser'

export class UserProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(25)
  username?: string

  @IsOptional()
  @IsString()
  @MaxLength(250)
  bio?: string

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(46)
  avatar?: string

  @IsOptional()
  @IsString()
  @MaxLength(46)
  banner?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Links)
  links?: Links[]
}

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

    // Validate the instance
    const errors = await validate(userProfileInstance)

    if (errors.length > 0) {
      throw new BadRequestException(errors)
    }

    return userProfileInstance
  }
}

export default UserProfileValidator
