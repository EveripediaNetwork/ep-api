/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator'

@ValidatorConstraint({ name: 'valid String', async: true })
export default class ValidStringParams implements ValidatorConstraintInterface {
  async validate(text: string, args: ValidationArguments) {
    return /^[a-zA-Z0-9\/-]*$/.test(text)
  }

  defaultMessage(args: ValidationArguments) {
    return 'Invalid parameters'
  }
}
