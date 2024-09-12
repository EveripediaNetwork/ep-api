import {
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import slugify from 'slugify'
import { HttpService } from '@nestjs/axios'
import { Cache } from 'cache-manager'
import { Blog, BlogInput, FormatedBlogType } from './blog.dto'
import { RawTransactionsInput } from './transaction.dto'
import { EntryPathInput, EntryPathOutput } from './entryPath.dto'
import { BlockInput, BlogTagInput } from './block.dto'

@Injectable()
class BlogService {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async formatEntry(
    blog: Partial<Blog>,
    transactionId: string,
    timestamp: number,
  ): Promise<FormatedBlogType> {
    return {
      title: blog.title || '',
      slug: blog.title ? slugify(blog.title) : transactionId,
      body: blog.body || '',
      digest: blog.digest || '',
      contributor: blog.contributor || '',
      transaction: transactionId,
      timestamp,
      cover_image: blog.body
        ? (blog.body
            .split('\n\n')[0]
            .match(/!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)/m) || [])?.[1] ||
          undefined
        : undefined,
      image_sizes: 50,
    }
  }

  formatBlog(blog: Blog): FormatedBlogType {
    const formattedBlog: FormatedBlogType = {
      title: blog.title || '',
      slug: slugify(blog.title || ''),
      digest: blog.digest || '',
      contributor: blog.publisher?.project?.address || '',
      timestamp: blog.timestamp || blog.publishedAtTimestamp,
      cover_image: blog.body
        ? (blog.body
            .split('\n\n')[0]
            .match(/!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)/m) || [])?.[1] ||
          undefined
        : undefined,
      image_sizes: 50,
    }

    return formattedBlog
  }

  async getBlogsFromAccounts(): Promise<FormatedBlogType[]> {
    const accounts = [
      this.configService.get<string>('EVERIPEDIA_BLOG_ACCOUNT2'),
      this.configService.get<string>('EVERIPEDIA_BLOG_ACCOUNT3'),
    ]

    const allBlogs = await Promise.all(
      accounts
        .filter((account): account is string => !!account)
        .map(async (account) => {
          const entries = await this.fetchBlogsFromAccount(account)
          return entries
            .filter((entry) => entry.publishedAtTimestamp !== undefined)
            .map((b) => this.formatBlog(b))
        }),
    )

    return allBlogs
      .flat()
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  }

  async getEntryPaths(
    rawTransactions: RawTransactionsInput,
  ): Promise<EntryPathOutput[]> {
    if (!rawTransactions.transactions || !rawTransactions.transactions.edges) {
      return []
    }

    return rawTransactions.transactions.edges
      .map(({ node }) => {
        if (!node || !node.block || !node.tags) {
          return null
        }

        const tags = Object.fromEntries(
          node.tags.map((tag: BlogTagInput) => [tag.name, tag.value]),
        )
        const slug = tags['Original-Content-Digest']
        if (!slug) {
          return null
        }

        return {
          slug,
          path: node.id,
          timestamp: (node.block as BlockInput).timestamp,
        }
      })
      .filter((entry): entry is EntryPathOutput => entry !== null)
      .reduce((acc: EntryPathOutput[], current) => {
        const existingEntry = acc.find((entry) => entry.slug === current.slug)
        if (!existingEntry) {
          return [...acc, current]
        }

        existingEntry.timestamp = current.timestamp
        return acc
      }, [])
  }

  async getBlogEntriesFormatted(entryPaths: EntryPathInput[]): Promise<Blog[]> {
    const entries = await Promise.all(
      entryPaths.map((entry) => this.mapEntry(entry)),
    )
    return entries
      .filter((entry): entry is Blog => entry !== null)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .reduce((acc: Blog[], current) => {
        const existingEntry = acc.find((entry) => entry.slug === current.slug)
        if (!existingEntry) return [...acc, current]
        return acc
      }, [])
  }

  private async fetchBlogsFromAccount(account: string): Promise<Blog[]> {
    const mirrorApiUrl = this.configService.get<string>('MIRROR_API_URL')

    if (!mirrorApiUrl) {
      throw new Error('Mirror API url is not found')
    }
    const response = await this.httpService
      .post(mirrorApiUrl, {
        query: `
        query GetBlogs($projectAddress: String!) {
          entries(projectAddress: $projectAddress) {
            title
            body
            digest
            publishedAtTimestamp
            publisher {
              project {
                address
              }
            }
          }
        }
      `,
        variables: { projectAddress: account },
      })
      .toPromise()

    return response?.data?.data?.entries || []
  }

  private async mapEntry(entry: EntryPathInput): Promise<Blog | null> {
    try {
      const blogAPIUrl = this.configService.get<string>('BLOG_DATA_API')
      if (!blogAPIUrl) {
        throw new Error('BLOG_DATA_API URL not found')
      }
      const response = await this.httpService
        .get(`${blogAPIUrl}/${entry.path}`)
        .toPromise()
      const data = response?.data

      if (data) {
        const {
          content: { title, body },
          digest,
          authorship: { contributor },
          transactionId,
        } = data

        return (await this.formatEntry(
          { title, body, digest, contributor, transaction: transactionId },
          entry.slug,
          entry.timestamp || 0,
        )) as Blog
      }

      return null
    } catch (error) {
      console.error(`Error mapping entry: ${entry.path}`, error)
      return null
    }
  }

  async fetchBlogByTransactionId(
    transactionId: string,
  ): Promise<Partial<Blog> | null> {
    try {
      const response = await this.httpService
        .get(`${this.configService.get('BLOG_DATA_API')}/${transactionId}`)
        .toPromise()
      const data = response?.data

      if (data) {
        const {
          content: { title, body },
          digest,
          authorship: { contributor },
        } = data

        return { title, body, digest, contributor }
      }

      return null
    } catch (error) {
      console.error(
        `Error fetching blog by transaction ID: ${transactionId}`,
        error,
      )
      return null
    }
  }

  async getBlogs(blogInput: BlogInput): Promise<any> {
    try {
      const cacheKey = JSON.stringify(blogInput)
      const cachedData = await this.cacheManager.get(cacheKey)

      if (cachedData) {
        return cachedData
      }

      let result
      if (blogInput.slug) {
        result = await this.getBlogsFromAccounts()
        const blog = result.find((BLOG) => BLOG.slug === blogInput.slug)
        if (!blog) {
          throw new NotFoundException(
            `Blog with slug ${blogInput.slug} not found`,
          )
        }
        return blog
      }
      if (blogInput.transaction && blogInput.timestamp) {
        result = await this.fetchBlogByTransactionId(blogInput.transaction)
        if (!result)
          throw new NotFoundException(
            `Blog with transaction ID ${blogInput.transaction} not found`,
          )
        result = await this.formatEntry(
          result,
          blogInput.transaction,
          blogInput.timestamp,
        )
        return result
      }
      if (blogInput.rawTransactions) {
        result = await this.getEntryPaths(blogInput.rawTransactions)
        return result
      }
      if (blogInput.entryPaths) {
        result = await this.getBlogEntriesFormatted(blogInput.entryPaths)
        return result
      }
      result = await this.getBlogsFromAccounts()
      return result
    } catch (error) {
      if (error instanceof NotFoundException) throw error
      throw new BadRequestException('Failed to fetch or process blog data')
    }
  }
}

export default BlogService
