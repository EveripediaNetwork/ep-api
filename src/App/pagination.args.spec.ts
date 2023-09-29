import { validateSync } from 'class-validator'
import PaginationArgs, { OrderArgs } from './pagination.args'
import { Direction, OrderBy } from './general.args'

describe('PaginationArgs', () => {
  const args = new PaginationArgs()
  it('should have default values for offset and limit', () => {
    expect(args).toBeTruthy()
    expect(args.offset).toBe(0)
    expect(args.limit).toEqual(30)
  })

  it('should validate the limit to be within the range of 1 to 50', () => {
    args.limit = 0
    const errors = validateSync(args)
    expect(errors.length).toBeGreaterThan(0)

    args.limit = 100
    const errors2 = validateSync(args)
    expect(errors2.length).toBeGreaterThan(0)

    args.limit = 25
    const errors3 = validateSync(args)
    expect(errors3.length).toBe(0)
  })
})

describe('OrderArgs', () => {
  it('should inherit properties from PaginationArgs', () => {
    const args = new OrderArgs()

    expect(args.offset).toBe(0)
    expect(args.limit).toBe(30)
  })

  it('should have default values for direction and order', () => {
    const args = new OrderArgs()

    expect(args.direction).toBe(Direction.DESC)
    expect(args.order).toBe(OrderBy.UPDATED)
  })
})
