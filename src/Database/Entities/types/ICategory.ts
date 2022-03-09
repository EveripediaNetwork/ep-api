import { IWiki } from './IWiki'

export interface ICategory {
  id: string
  title: string
  wikis: IWiki[]
  description: string
  cardImage: string
  heroImage: string
  weight: number
  icon: string
}
