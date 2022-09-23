import { HttpException } from '@nestjs/common'

export enum ErrorTypes {
    USER_PROFILE_NOT_FOUND_ERROR = 'UserProfileNotFoundError'
}


export class GqlError extends HttpException {
  constructor(
    statusCode: number,
    objectOrError?: string | object | any ,
    description?: string
  ) {
    super(
      HttpException.createBody(objectOrError, description, statusCode),
      statusCode,
    )
  }
}

