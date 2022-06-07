// TODO: add all types
// right now only used ones are added

export interface IWiki {
  id: number
  title: string
}

export enum ValidatorCodes {
  VALID_WIKI = 'VALID_WIKI',
  LANGUAGE = 'LANGUAGE_ERROR',
  USER = 'USER_ERROR',
  WORDS = 'WORD_COUNT_ERROR',
  CATEGORY = 'CATEGORY_ERROR',
  IMAGE = 'IMAGE_ERROR',
  TAG = 'TAG_ERROR',
  URL = 'EXTERNAL_URL_ERROR',
}
