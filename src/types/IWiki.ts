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
