import { HttpException, HttpStatus } from '@nestjs/common'
import * as Web3Token from 'web3-token'

class TokenValidator {
  public validateToken(token: string, returnError?: boolean): string | any {
    let id
    try {
      const { address } = Web3Token.verify(token)
      id = address
    } catch (e: any) {
      if (
        (e.message === 'Token expired' ||
          e.message === 'Token malformed (unparsable JSON)') &&
        !returnError
      ) {
        throw new HttpException('Unathorized', HttpStatus.UNAUTHORIZED)
      }
      if (returnError) {
        return e.message
      }
      throw new HttpException(`${e.message}`, HttpStatus.UNPROCESSABLE_ENTITY)
    }
    return id
  }
}

export default TokenValidator
