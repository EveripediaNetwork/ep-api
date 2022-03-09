import { IWiki } from './IWiki'

export interface ILanguage {
  id: string
  title: string
  wikis: IWiki[]
}