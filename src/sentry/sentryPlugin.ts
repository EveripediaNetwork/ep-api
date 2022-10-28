/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ApolloServerPlugin,
  GraphQLRequestExecutionListener,
  GraphQLRequestListener,
} from 'apollo-server-plugin-base'
import { Plugin } from '@nestjs/apollo'
import { Context } from './sentryTransaction'

@Plugin()
export default class SentryPlugin implements ApolloServerPlugin<Context> {
  async requestDidStart({
    request,
    context,
  }: {
    request: any
    context: any
  }): Promise<GraphQLRequestListener> {
    if (request.operationName) {
      context.transaction.setName(request.operationName!)
    }
    return {
      willSendResponse() {
        return context.transaction.finish()
      },
      executionDidStart():
        | Promise<GraphQLRequestExecutionListener | void>
        | any {
        return {
          willResolveField({ info }: { info: any }) {
            const span = context.transaction.startChild({
              op: 'resolver',
              description: `${info.parentType.name}.${info.fieldName}`,
            })
            return () => span.finish()
          },
        }
      },
    }
  }
}
