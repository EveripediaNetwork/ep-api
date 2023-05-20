import ValidStringParams from '../customValidator'

describe('ValidStringParams', () => {
  it('should pass validation for valid string parameters', async () => {
    const validator = new ValidStringParams()
    const isValid = await validator.validate(
      'Valid String (with parentheses) ',
      null as any,
    )
    expect(isValid).toBe(true)
  })

  it('should fail validation for invalid string parameters', async () => {
    const validator = new ValidStringParams()
    const isValid = await validator.validate(
      'Invalid String $pecial[] {Characters',
      null as any,
    )
    expect(isValid).toBe(false)
  })
})
