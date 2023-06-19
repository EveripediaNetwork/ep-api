import PaginationArgs from '../../pagination.args'
import {
  ActivityArgs,
  ActivityArgsByUser,
  ActivityByCategoryArgs,
  ByIdAndBlockArgs,
} from './activity.dto'

describe('ActivityArgs', () => {
  it('should have the correct field types and decorators', () => {
    const activityArgs = new ActivityArgs()
    expect(activityArgs).toBeInstanceOf(PaginationArgs)
    expect(activityArgs).toHaveProperty('wikiId')
    expect(activityArgs).toHaveProperty('lang')
  })
})

describe('ActivityArgsByUser', () => {
  it('should have the correct field types and decorators', () => {
    const activityArgsByUser = new ActivityArgsByUser()
    expect(activityArgsByUser).toBeInstanceOf(PaginationArgs)
    expect(activityArgsByUser).toHaveProperty('userId')
  })
})

describe('ActivityByCategoryArgs', () => {
  it('should have the correct field types and decorators', () => {
    const activityByCategoryArgs = new ActivityByCategoryArgs()
    expect(activityByCategoryArgs).toBeInstanceOf(PaginationArgs)
    expect(activityByCategoryArgs).toHaveProperty('type')
    expect(activityByCategoryArgs).toHaveProperty('category')
  })
})

describe('ByIdAndBlockArgs', () => {
  it('should have the correct field types and decorators', () => {
    const byIdAndBlockArgs = new ByIdAndBlockArgs()
    expect(byIdAndBlockArgs).toBeInstanceOf(ActivityArgs)
    expect(byIdAndBlockArgs).toHaveProperty('block')
  })
})
