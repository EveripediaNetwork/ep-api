// TODO: add all types
// right now only used ones are added

export interface IWiki {
  id: number
  title: string
}

export enum ValidatorCodes {
  VALID = 'VALID WIKI',
  LANGUAGE = 'LANGUAGE ERROR',
  USER = 'USER ERROR',
  WORDS = 'WORD COUNT ERROR',
  CATEGORY = 'CATEGORY ERROR',
  IMAGE = 'IMAGE ERROR',
  TAG = 'TAG ERROR',
  URL = 'EXTERNAL URL ERROR'
}
