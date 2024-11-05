import { ValidationArguments } from 'class-validator'
import {
  ValidDateParams,
  ValidStringArrayParams,
  ValidStringParams,
} from '../customValidator'

describe('Validate', () => {
  let validStringParams: ValidStringParams
  let validDateParams: ValidDateParams
  let validStringArrayParams: ValidStringArrayParams
  let mockValidationArguments: ValidationArguments

  beforeEach(() => {
    validStringParams = new ValidStringParams()
    validDateParams = new ValidDateParams()
    validStringArrayParams = new ValidStringArrayParams()
    mockValidationArguments = {
      value: '',
      constraints: [],
      targetName: '',
      object: {},
      property: '',
    }
  })

  describe('ValidStringParams', () => {
    it('should pass validation for valid string parameters', async () => {
      const isValid = await validStringParams.validate(
        'Valid String-123',
        null as any,
      )
      expect(isValid).toBe(true)
    })

    it('should fail validation for invalid string parameters', async () => {
      const isValid = await validStringParams.validate(
        'Invalid$String[]@{Characters',
        null as any,
      )
      expect(isValid).toBe(false)
    })
    it('should return true for valid strings with alphanumeric characters', async () => {
      const validInputs = [
        'abc123',
        'ABC123',
        'Test123',
        'Hello World',
        'Hello-World',
        'Hello-World123',
        'Hello-World 123',
        'Test-123',
        'Test- 123',
        'Test 123',
        '',
      ]

      for (const input of validInputs) {
        const result = await validStringParams.validate(
          input,
          mockValidationArguments,
        )
        expect(result).toBe(true)
      }
    })

    it('should return false for strings with emoji, unicode or sepcial characters', async () => {
      const invalidInputs = [
        'Test😊123',
        'Test★123',
        'Test→123',
        'Test€123',
        'Test©123',
        'Test.123',
        'Test/123',
        'Test(123)',
        'Test@123',
        'Test$123',
        'Test#123',
      ]

      for (const input of invalidInputs) {
        const result = await validStringParams.validate(
          input,
          mockValidationArguments,
        )
        expect(result).toBe(false)
      }
    })

    it('should return true for null and undefined inputs', async () => {
      expect(
        await validStringParams.validate(null as any, mockValidationArguments),
      ).toBe(true)
      expect(
        await validStringParams.validate(
          undefined as any,
          mockValidationArguments,
        ),
      ).toBe(true)
    })

    it('should return true for strings with leading and trailing spaces', async () => {
      const validInputs = [' Test123', 'Test123 ', '  Test123  ', ' Test-123 ']
      for (const input of validInputs) {
        const result = await validStringParams.validate(
          input,
          mockValidationArguments,
        )
        expect(result).toBe(true)
      }
    })

    it('should return the default error message', () => {
      const message = validStringParams.defaultMessage(mockValidationArguments)
      expect(message).toBe('Invalid string parameters')
    })

    it('should handle very long strings', async () => {
      const longValidString = `${'a'.repeat(1000)}123${'b'.repeat(1000)}`
      const result = await validStringParams.validate(
        longValidString,
        mockValidationArguments,
      )
      expect(result).toBe(true)
    })

    it('should handle strings with multiple spaces', async () => {
      const multipleSpaces = 'Test   123    456'
      const result = await validStringParams.validate(
        multipleSpaces,
        mockValidationArguments,
      )
      expect(result).toBe(true)
    })
  })

  describe('ValidStringArrayParams', () => {
    it('should return true for an array of valid strings', async () => {
      const validArray = ['Hello', 'Test-123', 'Test/123', '123', '']
      const result = await validStringArrayParams.validate(
        validArray,
        mockValidationArguments,
      )
      expect(result).toBe(true)
    })

    it('should return false for an array with any invalid string', async () => {
      const invalidArray = ['Hello', 'Test😊123', 'Invalid@String']
      const result = await validStringArrayParams.validate(
        invalidArray,
        mockValidationArguments,
      )
      expect(result).toBe(false)
    })

    it('should return true for an empty array', async () => {
      const result = await validStringArrayParams.validate(
        [],
        mockValidationArguments,
      )
      expect(result).toBe(true)
    })

    it('should return true for a null or undefined array', async () => {
      expect(
        await validStringArrayParams.validate(
          null as any,
          mockValidationArguments,
        ),
      ).toBe(true)
      expect(
        await validStringArrayParams.validate(
          undefined as any,
          mockValidationArguments,
        ),
      ).toBe(true)
    })

    it('should return the default error message', () => {
      const message = validStringArrayParams.defaultMessage(
        mockValidationArguments,
      )
      expect(message).toBe('Invalid string parameters')
    })
  })

  describe('validDateParams', () => {
    it('should return true for valid date strings in YYYY-MM-DD or YYYY/MM/DD format', async () => {
      const validDates = [
        '2024-01-01',
        '1999/12/31',
        '2020-02-29',
        '1982/10/22',
      ]
      for (const date of validDates) {
        const result = await validDateParams.validate(
          date,
          mockValidationArguments,
        )
        expect(result).toBe(true)
      }
    })

    it('should return true for null or undefined dates', async () => {
      expect(
        await validDateParams.validate(null as any, mockValidationArguments),
      ).toBe(true)
      expect(
        await validDateParams.validate(
          undefined as any,
          mockValidationArguments,
        ),
      ).toBe(true)
    })

    it('should return the default error message for invalid date strings', () => {
      const message = validDateParams.defaultMessage(mockValidationArguments)
      expect(message).toBe('Invalid date string parameters')
    })
  })
})
