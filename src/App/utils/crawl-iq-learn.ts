import { Logger } from '@nestjs/common'
import { LearnDocs } from '../Search/search.types'

const INDEX_URL = 'https://learn.iq.wiki/iq/llms.txt'
const ORIGIN = 'https://learn.iq.wiki'
const UA = 'Mozilla/5.0 (NodeBot)'

function cleanMarkdown(content: string) {
  return (
    content
      // remove images
      .replace(/!\[.*?\]\(.*?\)/g, '')
      // remove gitbook-style embeds
      .replace(/{%\s*embed\s+url="[^"]*"\s*%}/g, '')
      // remove <figcaption>/<figcapture>
      .replace(/<\/?figcaption[^>]*>/gi, '')
      .replace(/<\/?figcapture[^>]*>/gi, '')
      .trim()
  )
}

/**
 * NOTE: This parser depends on the external format of llms.txt.
 * It searches for a heading like "# English" (any level 1–6) and
 * captures content until the next heading of the same or higher level.
 * If the upstream file changes heading text or structure, this may break.
 */
async function fetchEnglishBlock(logger: Logger) {
  const res = await fetch(INDEX_URL, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Failed to fetch index: ${res.status}`)
  const text = await res.text()

  const lines = text.split(/\r?\n/)
  const headingRegex = /^#{1,6}\s*english\s*$/i

  const start = lines.findIndex((l) => headingRegex.test(l.trim()))
  if (start === -1) {
    logger.warn(
      'English section not found in llms.txt; parser may be out of date',
    )
    return ''
  }

  const levelMatch = lines[start].match(/^#{1,6}/)
  const level = levelMatch ? levelMatch[0].length : 2

  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (/^#{1,6}\s+\S/.test(line)) {
      const nextLevel = line.match(/^#{1,6}/)?.[0].length ?? 6
      if (nextLevel <= level) {
        end = i
        break
      }
    }
  }

  const block = lines.slice(start, end).join('\n').trim()
  if (!block) {
    logger?.warn?.(
      'English block parsed as empty; upstream format may have changed',
    )
  }
  return block
}
async function fetchEnglishLinks(logger: Logger) {
  const block = await fetchEnglishBlock(logger)

  const matches = [...block.matchAll(/\((\/iq\/[^\s)]+)\)/g)]
  const paths = matches.map((m) => {
    let p = m[1].trim()
    if (!p.endsWith('.md')) p = `${p}.md`
    return p
  })

  const abs = Array.from(new Set(paths)).map((p) =>
    new URL(p, ORIGIN).toString(),
  )

  return abs
}

async function crawlIQLearnEnglish(logger: Logger) {
  try {
    const urls = await fetchEnglishLinks(logger)

    if (!urls || urls.length === 0) {
      logger.warn('No English links found from index')
      return []
    }

    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url, { headers: { 'User-Agent': UA } })
          if (!res.ok) {
            logger.error(
              `Failed to fetch learn doc at ${url}: HTTP ${res.status}`,
            )
            return null
          }

          let content = await res.text()
          content = cleanMarkdown(content)

          const h1 = content.match(/^#\s+(.*)$/m)?.[1]?.trim()
          const fallback = decodeURIComponent(
            new URL(url).pathname.split('/').filter(Boolean).pop() ||
              'Untitled',
          ).replace(/\.md$/i, '')
          let title = h1 || fallback

          const renames: Record<string, string> = {
            contracts: 'View IQ token contract addresses on different chains',
          }

          const newTitle = renames[title.toLowerCase()]
          if (newTitle) {
            title = newTitle
          }

          return { title, content } as LearnDocs
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          logger.error(
            `Failed to fetch or process learn doc at ${url}:`,
            message,
          )
          return null
        }
      }),
    )

    return results.filter((x): x is LearnDocs => x !== null)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Failed to fetch English links index:', message)
    return []
  }
}

export default crawlIQLearnEnglish
