/* eslint-disable import/no-cycle */
import RemoveMarkdown from 'remove-markdown'
import Wiki from '../../Database/Entities/wiki.entity'

export const shortenText = (text: string, length: number) =>
  text?.length > length ? `${text.substring(0, length)}...` : text

export enum WikiSummarySize {
  Small = 65,
  Medium = 70,
  Big = 160,
  Default = 255,
}

export const getWikiSummary = (
  wiki: Wiki,
  size: WikiSummarySize = WikiSummarySize.Big || WikiSummarySize.Default,
) => {
  if (wiki.summary) return shortenText(wiki.summary, size)
  if (wiki.content) {
    const trimmedContent = shortenText(wiki.content, size + 100)
    const cleanedContentSummary = RemoveMarkdown(trimmedContent)
    return shortenText(cleanedContentSummary, size)
  }
  return ''
}