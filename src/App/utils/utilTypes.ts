export enum ActionTypes {
  FLAG_WIKI = 'flagwiki',
  PINJSON_ERROR = 'pinJSON',
  GAS_PRICE_ERROR = 'relayer',
  ADMIN_ACTION = 'adminAction',
  CONTENT_FEEDBACK = 'contentFeedback',
  WIKI_ETH_ADDRESS = 'wikiEthAddress',
}

export enum AdminMutations {
  PROMOTE_WIKI = 'promoteWiki',
  HIDE_WIKI = 'hideWiki',
  UNHIDE_WIKI = 'unhideWiki',
  REVALIDATE_PAGE = 'revalidatePage',
  TOGGLE_USER_STATE = 'toggleUserStateById',
}

export interface IQSocialFeedbackWebhook {
  reportType?: string
  message?: string
}

export interface FlagWikiWebhook {
  report: string
  wikiId: string
  userId: string
}

export class AdminLogPayload {
  address!: string

  endpoint!: string

  id!: string

  status?: boolean
}

export interface WebhookPayload {
  ip?: string
  user?: string
  title?: string
  urlId?: string
  rating?: number
  choice?: boolean
  username?: string
  description?: string
  reportSubject?: string
  adminAction?: AdminMutations
  content?: Record<string, unknown>
  knownAddresses?: Record<string, number>
  unknownAddresses?: string[]
}
