import { ValidationArguments } from 'class-validator'
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

  let validator: ValidStringParams
  let mockValidationArguments: ValidationArguments

  beforeEach(() => {
    validator = new ValidStringParams()
    mockValidationArguments = {
      value: '',
      constraints: [],
      targetName: '',
      object: {},
      property: '',
    }
  })

  describe('validate', () => {
    it('should return true for valid strings with alphanumeric characters', async () => {
      const validInputs = [
        'abc123',
        'ABC123',
        'Test123',
        'Hello World',
        'Test-123',
        'Test.123',
        'Test/123',
        'Test (123)',
        '',
      ]

      for (const input of validInputs) {
        const result = await validator.validate(input, mockValidationArguments)
        expect(result).toBe(true)
      }
    })

    it('should return false for strings with emoji or unicode characters', async () => {
      const invalidInputs = [
        'Test😊123',
        'Test★123',
        'Test→123',
        'Test€123',
        'Test©123',
      ]

      for (const input of invalidInputs) {
        const result = await validator.validate(input, mockValidationArguments)
        expect(result).toBe(false)
      }
    })
  })

  describe('defaultMessage', () => {
    it('should return the default error message', () => {
      const message = validator.defaultMessage(mockValidationArguments)
      expect(message).toBe('Invalid parameters')
    })
  })

  describe('edge cases', () => {
    it('should handle very long strings', async () => {
      const longValidString = `${'a'.repeat(1000)}123${'b'.repeat(1000)}`
      const result = await validator.validate(
        longValidString,
        mockValidationArguments,
      )
      expect(result).toBe(true)
    })

    it('should handle strings with multiple spaces', async () => {
      const multipleSpaces = 'Test   123    456'
      const result = await validator.validate(
        multipleSpaces,
        mockValidationArguments,
      )
      expect(result).toBe(true)
    })

    it('should handle strings with multiple special characters', async () => {
      const validMultipleSpecial = 'Test-123/456 (789)'
      const result = await validator.validate(
        validMultipleSpecial,
        mockValidationArguments,
      )
      expect(result).toBe(true)
    })
  })
})
