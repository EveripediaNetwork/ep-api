import { HttpException } from '@nestjs/common'

export enum ErrorTypes {
    NOT_FOUND = 'NotFoundError'
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

