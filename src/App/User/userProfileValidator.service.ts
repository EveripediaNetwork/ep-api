import { HttpException, HttpStatus } from '@nestjs/common'
import { validateSync } from 'class-validator'
import { plainToClass } from 'class-transformer'
import {
  Links,
  Notifications,
  AdvancedSettings,
} from '../../Database/Entities/types/IUser'

interface ValidationError {
  field: string
  message: string
}

class UserProfileValidator {
  private errors: ValidationError[] = []

  private validateLinks(links?: Links[]): void {
    if (links) {
      const vals = links[0]
      if (
        vals.instagram === '' &&
        vals.lens === '' &&
        vals.twitter === '' &&
        vals.website === ''
      )
        return
    }
    if (!links) return

    if (!Array.isArray(links)) {
      this.errors.push({
        field: 'links',
        message: 'Links must be an array',
      })
      return
    }

    links.forEach((link, index) => {
      const linkObject = plainToClass(Links, link)
      const linkErrors = validateSync(linkObject)

      if (linkErrors.length > 0) {
        linkErrors.forEach((error) => {
          Object.values(error.constraints || {}).forEach((message) => {
            this.errors.push({
              field: `links[${index}].${error.property}`,
              message,
            })
          })
        })
      }

      Object.entries(link).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          if (value.length > 255) {
            this.errors.push({
              field: `links[${index}].${key}`,
              message: `${key} must not exceed 255 characters`,
            })
          }
        }
      })
    })
  }

  private validateNotifications(notifications?: Notifications[]): void {
    const notificationList = notifications || [new Notifications()]
    if (!notifications) {
      return
    }

    if (!Array.isArray(notifications)) {
      this.errors.push({
        field: 'notifications',
        message: 'Notifications must be an array',
      })
      return
    }

    notificationList.forEach((notification, index) => {
      const notificationObject = plainToClass(Notifications, notification)
      const notificationErrors = validateSync(notificationObject)

      if (notificationErrors.length > 0) {
        notificationErrors.forEach((error) => {
          Object.values(error.constraints || {}).forEach((message) => {
            this.errors.push({
              field: `notifications[${index}].${error.property}`,
              message,
            })
          })
        })
      }

      const requiredFlags = [
        'EVERIPEDIA_NOTIFICATIONS',
        'WIKI_OF_THE_DAY',
        'WIKI_OF_THE_MONTH',
        'EDIT_NOTIFICATIONS',
      ]

      requiredFlags.forEach((flag) => {
        if (typeof (notification as any)[flag] !== 'boolean') {
          this.errors.push({
            field: `notifications[${index}].${flag}`,
            message: `${flag} must be a boolean value`,
          })
        }
      })
    })
  }

  private validateAdvancedSettings(
    advancedSettings?: AdvancedSettings[],
  ): void {
    const settings = advancedSettings || [new AdvancedSettings()]
    if (!advancedSettings) {
      return
    }

    if (!Array.isArray(advancedSettings)) {
      this.errors.push({
        field: 'advancedSettings',
        message: 'Advanced settings must be an array',
      })
      return
    }

    settings.forEach((setting, index) => {
      const settingObject = plainToClass(AdvancedSettings, setting)
      const settingErrors = validateSync(settingObject)

      if (settingErrors.length > 0) {
        settingErrors.forEach((error) => {
          Object.values(error.constraints || {}).forEach((message) => {
            this.errors.push({
              field: `advancedSettings[${index}].${error.property}`,
              message,
            })
          })
        })
      }

      if (typeof setting.SIGN_EDITS_WITH_RELAYER !== 'boolean') {
        this.errors.push({
          field: `advancedSettings[${index}].SIGN_EDITS_WITH_RELAYER`,
          message: 'SIGN_EDITS_WITH_RELAYER must be a boolean value',
        })
      }
    })
  }

  private validateRequiredFields(data: any): void {
    console.log(data)
    if (!data.id || typeof data.id !== 'string' || data.id.length > 255) {
      this.errors.push({
        field: 'id',
        message: 'ID is required and must not exceed 255 characters',
      })
    }

    if (
      data.username &&
      (typeof data.username !== 'string' || data.username.length > 25)
    ) {
      this.errors.push({
        field: 'username',
        message: 'Username must not exceed 25 characters',
      })
    }

    if (data.bio && (typeof data.bio !== 'string' || data.bio.length > 250)) {
      this.errors.push({
        field: 'bio',
        message: 'Bio must not exceed 250 characters',
      })
    }

    if (
      data.email &&
      (typeof data.email !== 'string' || data.email.length > 100)
    ) {
      this.errors.push({
        field: 'email',
        message: 'Email must not exceed 100 characters',
      })
    }

    if (
      data.avatar &&
      (typeof data.avatar !== 'string' || data.avatar.length > 46)
    ) {
      this.errors.push({
        field: 'avatar',
        message: 'Avatar must not exceed 46 characters',
      })
    }

    if (
      data.banner &&
      (typeof data.banner !== 'string' || data.banner.length > 46)
    ) {
      this.errors.push({
        field: 'banner',
        message: 'Banner must not exceed 46 characters',
      })
    }
  }

  public validate(data: any): void {
    this.validateRequiredFields(data)

    this.validateLinks(data.links)
    this.validateNotifications(data.notifications)
    this.validateAdvancedSettings(data.advancedSettings)
    console.log(this.errors.length)

    if (this.errors.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errors: this.errors,
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }
}

export default UserProfileValidator
