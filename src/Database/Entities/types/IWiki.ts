// TODO: add all types
// right now only used ones are added

export interface IWiki {
  id: number
  title: string
}

export enum ValidatorCodes {
  VALID_WIKI = 'VALID_WIKI',
  ID = 'ID_ERROR',
  LANGUAGE = 'LANGUAGE_ERROR',
  USER = 'USER_ERROR',
  WORDS = 'WORD_COUNT_ERROR',
  CATEGORY = 'CATEGORY_ERROR',
  IMAGE = 'IMAGE_ERROR',
  TAG = 'TAG_ERROR',
  URL = 'EXTERNAL_URL_ERROR',
  METADATA = 'METADATA_ERROR',
  MEDIA = 'MEDIA_ERROR',
  GLOBAL_RATE_LIMIT = 'GLOBAL_RATE_LIMIT',
}

export enum CommonMetaIds {
  PAGE_TYPE = 'page-type',
  REFERENCES = 'references',

  // other info
  WEBSITE = 'website',
  CONTRACT_URL = 'contract_url',

  // social Links
  EMAIL_URL = 'email_url',
  FACEBOOK_PROFILE = 'facebook_profile',
  INSTAGRAM_PROFILE = 'instagram_profile',
  TWITTER_PROFILE = 'twitter_profile',
  LINKEDIN_PROFILE = 'linkedin_profile',
  YOUTUBE_PROFILE = 'youtube_profile',
  DISCORD_PROFILE = 'discord_profile',
  REDDIT_URL = 'reddit_profile',
  TELEGRAM_URL = 'telegram_profile',
  GITHUB_URL = 'github_profile',
  COIN_MARKET_CAP = 'coinmarketcap_url',
  COINGECKO_PROFILE = 'coingecko_profile',

  // Explorers
  ETHERSCAN_PROFILE = 'etherscan_profile',
  ARBISCAN_PROFILE = 'arbiscan_profile',
  POLYGONSCAN_PROFILE = 'polygonscan_profile',
  BSCSCAN_PROFILE = 'bscscan_profile',
  OPTIMISTIC_ETHERSCAN_PROFILE = 'optimistic_etherscan_profile',
}

export enum EditSpecificMetaIds {
  PREVIOUS_CID = 'previous_cid',
  COMMIT_MESSAGE = 'commit-message',
  WORDS_CHANGED = 'words-changed',
  PERCENT_CHANGED = 'percent-changed',
  BLOCKS_CHANGED = 'blocks-changed',
  WIKI_SCORE = 'wiki-score',
}

export enum PageTypeName {
  GENERIC = 'generic',
  PERSON = 'Person',
  EVENT = 'Event',
  DAPP = 'Dapp',
  NFT = 'NFT',
  TOKEN = 'Token',
}

export const WikiPossibleSocialsList = [
  // other info
  CommonMetaIds.WEBSITE,
  CommonMetaIds.CONTRACT_URL,

  // social Links
  CommonMetaIds.EMAIL_URL,
  CommonMetaIds.FACEBOOK_PROFILE,
  CommonMetaIds.INSTAGRAM_PROFILE,
  CommonMetaIds.TWITTER_PROFILE,
  CommonMetaIds.LINKEDIN_PROFILE,
  CommonMetaIds.YOUTUBE_PROFILE,
  CommonMetaIds.REDDIT_URL,
  CommonMetaIds.TELEGRAM_URL,
  CommonMetaIds.DISCORD_PROFILE,
  CommonMetaIds.GITHUB_URL,
  CommonMetaIds.COIN_MARKET_CAP,
  CommonMetaIds.COINGECKO_PROFILE,

  // Explorers
  CommonMetaIds.ETHERSCAN_PROFILE,
  CommonMetaIds.ARBISCAN_PROFILE,
  CommonMetaIds.POLYGONSCAN_PROFILE,
  CommonMetaIds.BSCSCAN_PROFILE,
  CommonMetaIds.OPTIMISTIC_ETHERSCAN_PROFILE,
]
