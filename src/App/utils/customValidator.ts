/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator'

@ValidatorConstraint({ name: 'customText', async: false })
export default  class ValidStringParams implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    return /^[a-zA-Z0-9-]*$/.test(text)
  }

  defaultMessage(args: ValidationArguments) {
    return 'Invalid parameters'
  }
}
