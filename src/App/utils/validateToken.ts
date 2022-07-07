import * as Web3Token from 'web3-token'

const validateToken = (token: string) => {
  let id
  try {
    const { address } = Web3Token.verify(token)
    id = address
  } catch (e: any) {
    return e.message
  }
  return id
}

export default validateToken
