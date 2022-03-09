import { IWiki } from './IWiki'

export interface IUser {
  id: string
  wikis: IWiki[]
}
