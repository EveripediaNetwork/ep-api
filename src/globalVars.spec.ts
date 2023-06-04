import USER_ACTIVITY_LIMIT from './globalVars'

describe('USER_ACTIVITY_LIMIT', () => {
  it('should be set to 150', () => {
    expect(USER_ACTIVITY_LIMIT).toBe(150)
  })
})
