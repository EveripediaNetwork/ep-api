import { Wiki as WikiType } from '@everipedia/iq-utils'

export enum ActionTypes {
  FLAG_WIKI = 'flagwiki',
  PINJSON_ERROR = 'pinJSON',
  ADMIN_ACTION = 'adminAction',
  CONTENT_FEEDBACK = 'contentFeedback',
}

export enum AdminMutations {
  PROMOTE_WIKI = 'promoteWiki',
  HIDE_WIKI = 'hideWiki',
  UNHIDE_WIKI = 'unhideWiki',
  REVALIDATE_PAGE = 'revalidatePage',
  TOGGLE_USER_STATE = 'toggleUserStateById',
}

export interface ContentFeedbackWebhook {
  wikiId: string
  userId?: string
  choice: boolean
}

export interface ContentStoreObject extends ContentFeedbackWebhook {
  ip: string
}

export interface WikiWebhookError {
  errorMessage: string
  data: WikiType
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






