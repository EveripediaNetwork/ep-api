import { EventType } from '@everipedia/iq-utils'

export interface IEvents {
  date: string
  title?: string
  type: EventType
  description?: string
  link?: string
  multiDateStart?: string
  multiDateEnd?: string
}
