const INDEX_URL = 'https://learn.iq.wiki/iq/llms.txt'
const ORIGIN = 'https://learn.iq.wiki'
const UA = 'Mozilla/5.0 (NodeBot)'

export type LearnDoc = { title: string; content: string }

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

async function fetchEnglishBlock() {
  const res = await fetch(INDEX_URL, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Failed to fetch index: ${res.status}`)
  const text = await res.text()

  const lines = text.split(/\r?\n/)
  const start = lines.findIndex((l) => /^##\s*English\s*$/i.test(l.trim()))
  if (start === -1) return ''
  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i].trim())) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join('\n')
}

async function fetchEnglishLinks() {
  const block = await fetchEnglishBlock()

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

export async function crawlIQLearnEnglish() {
  const urls = await fetchEnglishLinks()

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } })
        if (!res.ok) {
          return null
        }
        let content = await res.text()
        content = cleanMarkdown(content)

        const h1 = content.match(/^#\s+(.*)$/m)?.[1]?.trim()
        const fallback = decodeURIComponent(
          new URL(url).pathname.split('/').filter(Boolean).pop() || 'Untitled',
        ).replace(/\.md$/i, '')
        let title = h1 || fallback

        if (title.toLowerCase() === 'contracts') {
          title = 'View IQ token contract addresses on different chains'
        }

        return { title, content } as LearnDoc
      } catch (e: any) {
        return null
      }
    }),
  )

  return results.filter((x): x is LearnDoc => x !== null)
}
