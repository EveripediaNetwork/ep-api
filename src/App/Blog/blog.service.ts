import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { DataSource } from 'typeorm'
import slugify from 'slugify'
import ArweaveService from './arweave.service'
import {
  Blog,
  BlogTag,
  EntryPath,
  FormatedBlogType,
  RawTransactions,
} from './blog.dto'
import MirrorApiService from './mirrorApi.service'

@Injectable()
class BlogService {
  private BLOG_CACHE_KEY = 'blog-cache'

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private dataSource: DataSource,
    private httpService: HttpService,
    private configService: ConfigService,
    private arweaveService: ArweaveService,
    private readonly mirrorApiService: MirrorApiService,
  ) {}

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
      this.configService.get<string>('BLOG_ACCOUNT_2'),
      this.configService.get<string>('BLOG_ACCOUNT_3'),
    ]

    console.log(`Fetching blogs from accounts: ${accounts}`)

    const blogPromises = accounts.map(async (account) => {
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
    })

    const allBlogs = (await Promise.all(blogPromises)).flat()

    allBlogs.sort((a, b) => {
      const Data =
        new Date(b.timestamp ?? '').valueOf() -
        new Date(a.timestamp ?? '').valueOf()
      return Data
    })

    return allBlogs
  }

  async refreshCache(): Promise<void> {
    const blogs = await this.getBlogsFromAccounts()
    await this.cacheManager.set(this.BLOG_CACHE_KEY, blogs, { ttl: 3600 })
  }

  async getEntryPaths(rawTransactions: RawTransactions): Promise<EntryPath[]> {
    if (!rawTransactions.transactions || !rawTransactions.transactions.edges) {
      return []
    }

    return rawTransactions.transactions.edges
      .map(({ node }) => {
        if (!node || !node.block || !node.tags) {
          return { slug: '', path: '', timestamp: 0 }
        }

        const tags = Object.fromEntries(
          node.tags.map((tag: BlogTag) => [tag.name, tag.value]),
        )
        const slug = tags['Original-Content-Digest']
        if (!slug) {
          return null
        }

        return {
          slug,
          path: node.id,
          timestamp: node.block.timestamp,
        }
      })
      .filter((entry) => entry?.slug && entry?.slug !== '')
      .reduce((acc: EntryPath[], current) => {
        const x = acc.findIndex(
          (entry: EntryPath) => entry.slug === current?.slug,
        )
        if (x === -1) return acc.concat([current])

        acc[x].timestamp = current?.timestamp

        return acc
      }, [])
  }

  async mapEntry(entry: EntryPath): Promise<Blog | null> {
    try {
      const result = await this.arweaveService.getData(entry.path, {
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
        if (!formattedEntry.cover_image) formattedEntry.cover_image = undefined
        return formattedEntry
      }

      return null
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
        if (a && b) {
          return (b.timestamp || 0) - (a.timestamp || 0)
        }
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
}

export default BlogService
