import { Injectable, Inject } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import Arweave from 'arweave'
import slugify from 'slugify'
import { Blog, BlogTag, EntryPath, FormatedBlogType } from './blog.dto'
import MirrorApiService from './mirrorApi.service'
import HiddenBlog from './hideBlog.entity'

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

  private HIDDEN_BLOGS_CACHE_KEY = 'hidden-blogs-cache'

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private readonly mirrorApiService: MirrorApiService,
    @InjectDataSource() private dataSource: DataSource,
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

  private async getHiddenBlogDigests(): Promise<string[]> {
    let hiddenDigests = await this.cacheManager.get<string[]>(
      this.HIDDEN_BLOGS_CACHE_KEY,
    )

    if (!hiddenDigests) {
      const hiddenBlogs = await this.dataSource
        .getRepository(HiddenBlog)
        .find({ select: ['digest'] })

      hiddenDigests = hiddenBlogs.map((blog) => blog.digest)
      await this.cacheManager.set(
        this.HIDDEN_BLOGS_CACHE_KEY,
        hiddenDigests,
        7200 * 1000,
      )
    }

    return hiddenDigests
  }

  private async filterHiddenBlogs(blogs: Blog[]): Promise<Blog[]> {
    const hiddenDigests = await this.getHiddenBlogDigests()
    return blogs.filter((blog) => !hiddenDigests.includes(blog.digest))
  }

  private async refreshBlogCache(): Promise<Blog[]> {
    const accounts = [
      this.EVERIPEDIA_BLOG_ACCOUNT2,
      this.EVERIPEDIA_BLOG_ACCOUNT3,
    ]

    const blogs = await Promise.all(
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
          console.error(`Error fetching blogs for account ${account}:`, error)
          return []
        }
      }),
    ).then((blogArrays) => blogArrays.flat())

    await this.cacheManager.set(this.BLOG_CACHE_KEY, blogs, 7200 * 1000)
    return blogs
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
      await this.cacheManager.set(this.BLOG_CACHE_KEY, blogs, 7200 * 1000)
    }
    return this.filterHiddenBlogs(blogs || [])
  }

  async getBlogByDigest(digest: string): Promise<Blog | null> {
    const hiddenDigests = await this.getHiddenBlogDigests()
    if (hiddenDigests.includes(digest)) {
      return null
    }

    const blogs = await this.cacheManager.get<Blog[]>(this.BLOG_CACHE_KEY)

    const blog =
      blogs?.find((e: Blog) => e.digest === digest) ??
      (await this.mirrorApiService.getBlog(digest))

    return blog ? this.formatBlog(blog as Blog, true) : null
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
    try {
      const hiddenBlogRepo = this.dataSource.getRepository(HiddenBlog)

      const existing = await hiddenBlogRepo.findOne({ where: { digest } })
      if (!existing) {
        const hiddenBlog = hiddenBlogRepo.create({ digest })
        await hiddenBlogRepo.save(hiddenBlog)
      }

      await Promise.all([
        this.cacheManager.del(this.HIDDEN_BLOGS_CACHE_KEY),
        this.cacheManager.del(this.BLOG_CACHE_KEY),
      ])

      return true
    } catch (error) {
      console.error('Error hiding blog:', error)
      return false
    }
  }

  async unhideBlogByDigest(digest: string): Promise<boolean> {
    try {
      const hiddenBlogRepo = this.dataSource.getRepository(HiddenBlog)

      const existing = await hiddenBlogRepo.findOne({ where: { digest } })
      if (existing) {
        await hiddenBlogRepo.remove(existing)
      }

      await Promise.all([
        this.cacheManager.del(this.HIDDEN_BLOGS_CACHE_KEY),
        this.cacheManager.del(this.BLOG_CACHE_KEY),
      ])

      return true
    } catch (error) {
      console.error('Error unhiding blog:', error)
      return false
    }
  }

  async getHiddenBlogs(): Promise<Blog[]> {
    const hiddenBlogsRepo = this.dataSource.getRepository(HiddenBlog)
    const hiddenBlogs = await hiddenBlogsRepo.find({
      order: { hiddenAt: 'DESC' },
    })

    let allBlogs = await this.cacheManager.get<Blog[]>(this.BLOG_CACHE_KEY)
    if (!allBlogs) {
      allBlogs = await this.refreshBlogCache()
    }

    const hiddenBlogsWithInfo = allBlogs.filter((blog) =>
      hiddenBlogs.some((hiddenBlog) => hiddenBlog.digest === blog.digest),
    )

    return hiddenBlogsWithInfo.map((blog) => {
      const hiddenBlog = hiddenBlogs.find((hb) => hb.digest === blog.digest)
      return {
        ...blog,
        hiddenAt: hiddenBlog?.hiddenAt,
      }
    })
  }
}

export default BlogService
