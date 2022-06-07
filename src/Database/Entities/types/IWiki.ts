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
  METADATA = 'METADATA_ERROR',
}

export enum CommonMetaIds {
  PAGE_TYPE = 'page-type',
  REFERENCES = 'references',
  FACEBOOK_PROFILE = 'facebook_profile',
  INSTAGRAM_PROFILE = 'instagram_profile',
  TWITTER_PROFILE = 'twitter_profile',
  LINKEDIN_PROFILE = 'linkedin_profile',
  YOUTUBE_PROFILE = 'youtube_profile',
  COINGECKO_PROFILE = 'coingecko_profile',
  COMMIT_MESSAGE = 'commit-message',
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
