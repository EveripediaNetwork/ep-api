import { HttpException, HttpStatus } from '@nestjs/common'
import * as Web3Token from 'web3-token'

class TokenValidator {
  public validateToken(
    token: string,
    userId?: string,
    returnError?: boolean,
  ): string | boolean| any {
    try {
      const { address } = Web3Token.verify(token)
      if (userId && userId.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Not user')
      }
      if (!userId && !returnError) {
        return address
      }
      return true
    } catch (e: any) {
      if (
        (e.message === 'Token expired' ||
          e.message === 'Not user' ||
          e.message === 'Token malformed (unparsable JSON)') &&
        !returnError
      ) {
        throw new HttpException('Unathorized', HttpStatus.UNAUTHORIZED)
      }
      if (returnError) {
        return false
      }
      throw new HttpException(`${e.message}`, HttpStatus.UNPROCESSABLE_ENTITY)
    }
  }
}

export default TokenValidator
