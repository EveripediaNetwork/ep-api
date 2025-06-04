import { Injectable, Inject, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import Arweave from 'arweave'
import slugify from 'slugify'
import { OnEvent } from '@nestjs/event-emitter'
import { firstValueFrom, race, take, timer, Subject, mapTo } from 'rxjs'
import { Blog, BlogTag, EntryPath, FormatedBlogType } from './blog.dto'
import MirrorApiService from './mirrorApi.service'
import HiddenBlog from './hideBlog.entity'
import { firstLevelNodeProcess } from '../Treasury/treasury.dto'
import Pm2Service, { Pm2Events } from '../utils/pm2Service'

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
  private readonly logger = new Logger(BlogService.name)

  private blogDataSubject = new Subject<Blog[]>()

  private EVERIPEDIA_BLOG_ACCOUNT2: string

  private EVERIPEDIA_BLOG_ACCOUNT3: string

  private BLOG_CACHE_KEY = 'blog-cache'

  private HIDDEN_BLOGS_CACHE_KEY = 'hidden-blogs-cache'

  constructor(
    private pm2Service: Pm2Service,
    private configService: ConfigService,
    private readonly mirrorApiService: MirrorApiService,
    @InjectDataSource() private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.EVERIPEDIA_BLOG_ACCOUNT2 = this.configService.get(
      'EVERIPEDIA_BLOG_ACCOUNT2',
    ) as string
    this.EVERIPEDIA_BLOG_ACCOUNT3 = this.configService.get(
      'EVERIPEDIA_BLOG_ACCOUNT3',
    ) as string
  }

  async onApplicationBootstrap() {
    await this.getHiddenBlogDigests() // TODO: master process
    await this.loadBlogs()
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
        86400 * 1000,
      )
    }

    return hiddenDigests
  }

  private async filterHiddenBlogs(blogs: Blog[]): Promise<Blog[]> {
    const hiddenDigests = await this.getHiddenBlogDigests()
    return blogs.filter((blog) => !hiddenDigests.includes(blog.digest))
  }

  private async loadBlogs() {
    if (firstLevelNodeProcess()) {
      this.logger.log('Loading blogs')
      const accounts = [
        this.EVERIPEDIA_BLOG_ACCOUNT2,
        this.EVERIPEDIA_BLOG_ACCOUNT3,
      ]

      const allBlogs = await Promise.all(
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
            this.logger.error(
              `Error fetching blogs for account ${account}:`,
              error,
            )
            return []
          }
        }),
      ).then((blogArrays) => blogArrays.flat())

      if (allBlogs.length > 0) {
        const info = JSON.stringify(allBlogs)
        this.pm2Service.sendDataToProcesses(
          `${Pm2Events.UPDATE_CACHE} ${BlogService.name}`,
          {
            data: info,
            key: this.BLOG_CACHE_KEY,
            ttl: 7200 * 1000,
          },
          Number(process.env.pm_id),
        )
        await this.cacheManager.set(this.BLOG_CACHE_KEY, allBlogs, 7200 * 1000)
      }
    }
    this.logger.log('done')
  }

  async getBlogsFromAccounts(): Promise<Blog[]> {
    const blogs = await this.cacheManager.get<Blog[]>(this.BLOG_CACHE_KEY)
    if (!blogs) {
      if (!firstLevelNodeProcess()) {
        const data = JSON.stringify({ processId: process.env.pm_id })
        this.pm2Service.sendDataToProcesses(
          `${Pm2Events.BLOG_REQUEST_DATA} ${BlogService.name}`,
          {
            data,
          },
          'all',
        )

        const timeout$ = timer(15000).pipe(mapTo([] as Blog[]), take(1))

        const data$ = this.blogDataSubject.pipe(take(1))

        try {
          const result = await firstValueFrom(race([data$, timeout$]))
          this.blogDataSubject = new Subject()
          if (result.length !== 0) {
            await this.cacheManager.set(
              this.BLOG_CACHE_KEY,
              result,
              7200 * 1000,
            )
          }
          return await this.filterHiddenBlogs(result)
        } catch (error) {
          return []
        }
      }
      return []
    }
    return this.filterHiddenBlogs(blogs || [])
  }

  async getBlogByDigest(digest: string): Promise<Blog | null> {
    const hiddenDigests = await this.getHiddenBlogDigests()
    if (hiddenDigests.includes(digest)) {
      return null
    }

    const blogs = await this.getBlogsFromAccounts()

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
      this.logger.error(`Error mapping entry: ${entry.path}`, _error)
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
      this.logger.error('Error hiding blog:', error)
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
      this.logger.error('Error unhiding blog:', error)
      return false
    }
  }

  async getHiddenBlogs(): Promise<Blog[]> {
    const hiddenBlogsRepo = this.dataSource.getRepository(HiddenBlog)
    const hiddenBlogs = await hiddenBlogsRepo.find({
      order: { hiddenAt: 'DESC' },
    })

    const allBlogs = await this.getBlogsFromAccounts()

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

  @OnEvent(Pm2Events.BLOG_REQUEST_DATA, { async: true })
  async requestData(payload: any): Promise<void> {
    const { processId } = JSON.parse(payload.data.data)
    const id = Number(processId)

    let blogs = await this.getBlogsFromAccounts()

    if (blogs.length === 0) {
      await this.loadBlogs()
      blogs = await this.getBlogsFromAccounts()
    }

    const data = JSON.stringify(blogs)
    await this.pm2Service.sendDataToProcesses(
      `${Pm2Events.BLOG_SEND_DATA} ${BlogService.name}`,
      { data },
      'one',
      id,
    )
  }

  @OnEvent(Pm2Events.BLOG_SEND_DATA, { async: true })
  async sendData(payload: any) {
    const blogs = JSON.parse(payload.data.data)
    this.blogDataSubject.next(blogs)
  }
}

export default BlogService
