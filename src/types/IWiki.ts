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

export interface IWiki {
  id: string
  version: number
  language: string
  title: string
  content: string
  summary?: string
  tags: {
    id: string
  }[]
  metadata: {
    id: string
    value: string
  }[]
  categories: {
    id: string
    title: string
  }[]
  images: {
    id: string
    type: string
  }[]
  user: {
    id: string
  }
}
