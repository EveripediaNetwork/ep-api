import { MiddlewareContext } from '@nestjs/graphql'
import skipMiddleware from './skipMiddleware'

describe('skipMiddleware', () => {
  let next: jest.Mock
  let ctx: MiddlewareContext<any, any, any>

  beforeEach(() => {
    next = jest.fn()
    ctx = {
      source: {},
      args: {},
      context: {},
      info: {
        path: {
          prev: {
            prev: { key: 'userById' },
            key: 'getProfile',
          },
        },
      } as any,
    }
  })

  it('should return null when the endpoint is not in the allowed list', async () => {
    next.mockResolvedValue(null)
    await expect(skipMiddleware(ctx, next)).resolves.toEqual(null)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('should call the next function and return the value when the endpoint is in the allowed list', async () => {
    next.mockResolvedValue('someValue')

    await expect(skipMiddleware(ctx, next)).resolves.toEqual('someValue')

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })
})
