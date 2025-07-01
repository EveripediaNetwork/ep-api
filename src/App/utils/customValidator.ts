/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator'

@ValidatorConstraint({ name: 'valid String', async: true })
export class ValidStringParams implements ValidatorConstraintInterface {
  async validate(text: string, _args: ValidationArguments) {
    // return /^[a-zA-Z0-9- ]*$/.test(text)
    return /^[a-zA-Z0-9- .]*$/.test(text)
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Invalid string parameters'
  }
}
@ValidatorConstraint({ name: 'valid array of strings', async: true })
export class ValidStringArrayParams implements ValidatorConstraintInterface {
  async validate(text: string[], _args: ValidationArguments) {
    if (!text) return true
    return text.every((str) => /^[a-zA-Z0-9()/ -.]*$/.test(str))
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Invalid string parameters'
  }
}

@ValidatorConstraint({ name: 'valid date string', async: true })
export class ValidDateParams implements ValidatorConstraintInterface {
  async validate(text: string, _args: ValidationArguments) {
    const dateRegex = /^\d{4}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12][0-9]|3[01])$/
    if (!text) {
      return true
    }
    return dateRegex.test(text)
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Invalid date string parameters'
  }
}
