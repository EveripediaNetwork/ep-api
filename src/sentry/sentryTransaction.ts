import * as Sentry from '@sentry/node'
import { Transaction } from '@sentry/types'

export interface Context {
  transaction: Transaction
}

export async function createContext(): Promise<Context> {
  const transaction = Sentry.startTransaction({
    op: 'gql',
    name: 'GraphQLTransaction',
  })
  return { transaction }
}
