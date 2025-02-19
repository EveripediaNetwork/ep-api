/* eslint-disable no-param-reassign */
import { Plugin } from '@nestjs/apollo'
import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  GraphQLRequestContext,
} from '@apollo/server'
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry'
import '@sentry/tracing'
import { Context } from '@sentry/node/types/integrations/context'

@Plugin()
export default class SentryPlugin implements ApolloServerPlugin<Context> {
  constructor(@InjectSentry() private readonly sentry: SentryService) {}

  async requestDidStart({
    request,
    context,
  }: GraphQLRequestContext<Context> | any): Promise<
    GraphQLRequestListener<Context>
  > {
    const { query } = request
    const methodName = query.match(/[{]\s+(\w+)/)
    const [, name] = methodName
    process.setMaxListeners(0)
    if (request.operationName === 'IntrospectionQuery') {
      return {
        async executionDidStart() {
          return {}
        },
      }
    }

    const transaction = this.sentry.instance().startTransaction({
      op: 'gql',
      name: request.operationName
        ? `GraphQLTransaction /${request.operationName}`
        : `Graphql: ${name || 'Unknown Query/Mutation'}`,
    })

    try {
      this.sentry
        .instance()
        .getCurrentHub()
        .configureScope((scope) => {
          if (!context?.req) return
          const { headers, body: data, method, baseUrl: url } = context.req
          scope.addEventProcessor((event) => {
            event.request = { method, url, headers, data }
            return event
          })
        })

      this.sentry.instance().configureScope((scope) => {
        scope.setSpan(transaction)
      })
    } catch (e: any) {
      console.error(e)
    }

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
