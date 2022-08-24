export enum SortTypes {
  ASC = 'ASC',
  DESC = 'DESC',
  ALPHABET_ASC = 'ALPB ASC',
  ALPHABET_DESC = 'ALPB DESC',
}
export const orderWikis = (sortValue: SortTypes) => {
  let sort = {}
  switch (sortValue) {
    case SortTypes.ASC:
      sort = { updated: 'ASC' }
      break
    case SortTypes.ALPHABET_ASC:
      sort = { id: 'ASC' }
      break
    case SortTypes.ALPHABET_DESC:
      sort = { id: 'DESC' }
      break
    default:
      sort = { updated: 'DESC' }
  }
  return sort
}
