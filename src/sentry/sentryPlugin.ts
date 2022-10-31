/* eslint-disable no-param-reassign */
import { Plugin } from '@nestjs/apollo'
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from 'apollo-server-plugin-base'
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry'
import { GraphQLRequestContext } from 'apollo-server-types'
import '@sentry/tracing'
import { Context } from './sentryTransaction'

@Plugin()
export default class SentryPlugin implements ApolloServerPlugin<Context> {
  constructor(@InjectSentry() private readonly sentry: SentryService) {}

  async requestDidStart({
    request,
    context,
  }: GraphQLRequestContext | any): Promise<GraphQLRequestListener> {
    // const { query } = request
    // const methodName = query.match(/{\n.+\s((\s?\w+))((\()|(\n)|( ))/)

    const transaction = this.sentry.instance().startTransaction({
      op: 'gql',
      name: request.operationName
        ? `GraphQLTransaction /${request.operationName}`
        : `graphql: query`,
    })

    this.sentry
      .instance()
      .getCurrentHub()
      .configureScope(scope => {
        const { headers, body: data, method, baseUrl: url } = context.req
        scope.addEventProcessor(event => {
          event.request = { method, url, headers, data }
          return event
        })
      })

    this.sentry.instance().configureScope(scope => {
      scope.setSpan(transaction)
    })

    return {
      async willSendResponse() {
        transaction.finish()
      },
      async executionDidStart() {
        return {
          willResolveField({ info }) {
            const span = transaction.startChild({
              op: 'resolver',
              description: `${info.parentType.name}.${info.fieldName}`,
            })
            return () => {
              span.finish()
            }
          },
        }
      },
    }
  }
}
