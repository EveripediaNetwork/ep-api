// TODO: add all types
// right now only used ones are added

export interface IWiki {
  id: number
  title: string
}

export enum ValidatorCodes {
  VALID_WIKI = 'VALID WIKI',
  LANGUAGE = 'LANGUAGE ERROR',
  USER = 'USER ERROR',
  WORDS = 'WORD COUNT ERROR',
  CATEGORY = 'CATEGORY ERROR',
  IMAGE = 'IMAGE ERROR',
  TAG = 'TAG ERROR',
  URL = 'EXTERNAL URL ERROR',
}

export enum CommonMetaIds {
  PAGE_TYPE = 'page-type',
  REFERENCES = 'references',
  FACEBOOK_PROFILE = 'facebook_profile',
  INSTAGRAM_PROFILE = 'instagram_profile',
  TWITTER_PROFILE = 'twitter_profile',
  LINKEDIN_PROFILE = 'linkedin_profile',
  YOUTUBE_PROFILE = 'youtube_profile',
}

export enum EditSpecificMetaIds {
  COMMIT_MESSAGE = 'commit-message',
  WORDS_CHANGED = 'words-changed',
  PERCENT_CHANGED = 'percent-changed',
  BLOCKS_CHANGED = 'blocks-changed',
}

export enum PageTypeName {
  GENERIC = 'generic',
  PERSON = 'Person',
  EVENT = 'Event',
  DAPP = 'Dapp',
  NFT = 'NFT',
  TOKEN = 'Token',
}