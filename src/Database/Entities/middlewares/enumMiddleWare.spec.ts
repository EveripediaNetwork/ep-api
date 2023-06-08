import { MiddlewareContext } from '@nestjs/graphql'
import enumMiddleWare from './enumMiddleware'

describe('enumMiddleWare', () => {
  let next: jest.Mock
  let ctx: MiddlewareContext<any, any, { [argName: string]: any }>

  beforeEach(() => {
    next = jest.fn()
    ctx = {
      source: {},
      args: {},
      context: {},
      info: {} as any,
    }
  })

  it('should return 1 when the value is "1"', async () => {
    const value = '1'

    next.mockResolvedValue(value)
    await expect(enumMiddleWare(ctx, next)).resolves.toEqual(1)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalled()
  })

  it('should return 0 when the value is "0"', async () => {
    const value = '0'

    next.mockResolvedValue(value)
    await expect(enumMiddleWare(ctx, next)).resolves.toEqual(0)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalled()
  })
})
