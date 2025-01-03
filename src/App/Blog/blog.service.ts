import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import Arweave from 'arweave'
import slugify from 'slugify'
import { Blog, BlogTag, EntryPath, FormatedBlogType } from './blog.dto'
import MirrorApiService from './mirrorApi.service'

const arweave = Arweave.init({
  host: 'arweave.net',
  protocol: 'https',
  port: 443,
  timeout: 5000,
})

export type BlogNode = {
  id: string
  block: {
    timestamp: number
  }
  tags: BlogTag[]
}

export type RawTransactions = {
  transactions: {
    edges: {
      node: BlogNode
    }[]
  }
}

@Injectable()
class BlogService {
  private EVERIPEDIA_BLOG_ACCOUNT2: string

  private EVERIPEDIA_BLOG_ACCOUNT3: string

  private BLOG_CACHE_KEY = 'blog-cache'

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private readonly mirrorApiService: MirrorApiService,
  ) {
    this.EVERIPEDIA_BLOG_ACCOUNT2 = this.configService.get(
      'EVERIPEDIA_BLOG_ACCOUNT2',
    ) as string
    this.EVERIPEDIA_BLOG_ACCOUNT3 = this.configService.get(
      'EVERIPEDIA_BLOG_ACCOUNT3',
    ) as string
  }

  async formatEntry(
    blog: Partial<Blog>,
    transactionId: string,
    timestamp: number,
  ): Promise<Blog> {
    return {
      title: blog.title || '',
      slug: slugify(blog.title || ''),
      body: blog.body || '',
      digest: blog.digest || '',
      contributor: blog.contributor || '',
      transaction: transactionId,
      timestamp,
      cover_image: blog.body
        ? (blog.body
            .split('\n\n')[0]
            .match(/!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)/m) || [])?.[1] ||
          ''
        : undefined,
      image_sizes: 50,
    }
  }

  formatBlog(blog: Blog, hasBody?: boolean) {
    const regex = /\*\*(.*?)\*\*/g
    const newBlog: FormatedBlogType = {
      title: blog?.title || '',
      slug: slugify(blog?.title || ''),
      digest: blog?.digest || '',
      contributor: blog?.publisher?.project?.address || '',
      timestamp: blog?.timestamp,
      cover_image: blog?.body
        ? (blog?.body
            .split('\n\n')[0]
            .match(/!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)/m) || [])?.[1]
        : '',
      image_sizes: 50,
    }
    if (hasBody) {
      newBlog.body = blog?.body
      newBlog.excerpt = blog?.body
        ? blog?.body.split('\n\n')[1].replace(regex, '$1')
        : ''
    }
    return newBlog
  }

  async getBlogsFromAccounts(): Promise<Blog[]> {
    const accounts = [
      this.EVERIPEDIA_BLOG_ACCOUNT2,
      this.EVERIPEDIA_BLOG_ACCOUNT3,
    ]

    let blogs = await this.cacheManager.get<Blog[]>(this.BLOG_CACHE_KEY)
    if (!blogs) {
      blogs = await Promise.all(
        accounts.map(async (account) => {
          try {
            if (!account) return []
            const entries = await this.mirrorApiService.getBlogs(account)
            return (
              entries
                ?.filter((entry) => entry.publishedAtTimestamp)
                .map((b: Blog) => this.formatBlog(b, true)) || []
            )
          } catch (error) {
            console.log(`Error fetching blogs for account ${account}:`, error)
            return []
          }
        }),
      ).then((blogArrays) => blogArrays.flat())
    }

    if (blogs) {
      blogs = blogs.filter((blog) => !blog.hidden)
    } else {
      blogs = []
    }

    await this.cacheManager.set(this.BLOG_CACHE_KEY, blogs, { ttl: 7200 })
    return blogs as Blog[]
  }

  async getBlogByDigest(digest: string): Promise<Blog> {
    const blogs = await this.cacheManager.get<Blog[]>(this.BLOG_CACHE_KEY)

    const blog =
      blogs?.find((e: Blog) => e.digest === digest) ??
      (await this.mirrorApiService.getBlog(digest))

    return this.formatBlog(blog as Blog, true)
  }

  async getEntryPaths({ transactions }: RawTransactions): Promise<EntryPath[]> {
    return transactions.edges
      .map(({ node }) => {
        const tags = Object.fromEntries(
          node.tags.map((tag: BlogTag) => [tag.name, tag.value]),
        )

        if (!node || !node.block) return { slug: '', path: '', timestamp: 0 }

        return {
          slug: tags['Original-Content-Digest'],
          path: node.id,
          timestamp: node.block.timestamp,
        }
      })
      .filter((entry) => entry.slug && entry.slug !== '')
      .reduce((acc: EntryPath[], current) => {
        const x = acc.findIndex(
          (entry: EntryPath) => entry.slug === current.slug,
        )
        if (x === -1) return acc.concat([current])

        acc[x].timestamp = current.timestamp

        return acc
      }, [])
  }

  async mapEntry(entry: EntryPath) {
    try {
      const result = await arweave.transactions.getData(entry.path, {
        decode: true,
        string: true,
      })

      const parsedResult = JSON.parse(result as string)
      const {
        content: { title, body },
        digest,
        authorship: { contributor },
        transactionId,
      } = parsedResult

      if (result) {
        const formattedEntry = await this.formatEntry(
          { title, body, digest, contributor, transaction: transactionId },
          entry.slug,
          entry.timestamp || 0,
        )

        if (!formattedEntry.cover_image) {
          return null
        }

        return formattedEntry
      }
      return undefined
    } catch (_error) {
      console.error(`Error mapping entry: ${entry.path}`, _error)
      return null
    }
  }

  async getBlogEntriesFormatted(entryPaths: EntryPath[]): Promise<Blog[]> {
    const entries = await Promise.all(
      entryPaths.map(async (entry: EntryPath) => this.mapEntry(entry)),
    )
    return entries
      .sort((a, b) => {
        if (a && b) return (b.timestamp || 0) - (a.timestamp || 0)

        return 0
      })
      .reduce((acc: Blog[], current) => {
        const x = acc.find(
          (entry: Blog) => current && entry.slug === current.slug,
        )
        if (!x && current) return acc.concat([current as Blog])
        return acc
      }, [])
  }

  async getBlogSuggestions(limit: number): Promise<Blog[]> {
    const getAllBlogs = await this.getBlogsFromAccounts()

    const randomBlog = getAllBlogs.sort(() => 0.5 - Math.random())

    const minMaxLimit = Math.min(Math.max(limit, 1), 3)

    return randomBlog.slice(0, minMaxLimit)
  }

  async hideBlogByDigest(digest: string): Promise<boolean> {
    let blogs = await this.cacheManager.get<Blog[]>(this.BLOG_CACHE_KEY)

    if (!blogs) {
      blogs = await this.getBlogsFromAccounts()
    }

    if (blogs && Array.isArray(blogs)) {
      const blogIndex = blogs.findIndex((e: Blog) => e.digest === digest)

      if (blogIndex !== -1) {
        blogs[blogIndex].hidden = true
        await this.cacheManager.set(this.BLOG_CACHE_KEY, blogs, { ttl: 7200 })
        return true
      }
    }
    return false
  }
}

export default BlogService
