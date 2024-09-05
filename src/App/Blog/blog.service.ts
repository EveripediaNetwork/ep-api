import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Blog, FormatedBlogType, EntryPath, RawTransactions } from './blog.dto'
import slugify from 'slugify'
import { HttpService } from '@nestjs/axios'

@Injectable()
export class BlogService {
  constructor(
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
      slug: slugify(blog.title || ''),
      body: blog.body || '',
      digest: blog.digest || '',
      contributor: blog.contributor || '',
      transaction: transactionId,
      timestamp,
      cover_image: blog.body
        ? (blog.body
            .split('\n\n')[0]
            .match(/!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)/m) || [])?.[1]
        : null,
      image_sizes: 50,
    }
  }

  formatBlog(blog: Blog, hasBody: boolean = false): FormatedBlogType {
    const formattedBlog: FormatedBlogType = {
      title: blog.title || '',
      slug: slugify(blog.title || ''),
      digest: blog.digest || '',
      contributor: blog.publisher?.project?.address || '',
      timestamp: blog.timestamp || blog.publishedAtTimestamp,
      cover_image: blog.body
        ? (blog.body
            .split('\n\n')[0]
            .match(/!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)/m) || [])?.[1]
        : null,
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
            .map((b) => this.formatBlog(b, true))
        }),
    )

    return allBlogs
      .flat()
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  }

  getEntryPaths(rawTransactions: RawTransactions): EntryPath[] {
    return rawTransactions.transactions.edges
      .map(({ node }) => {
        const tags = Object.fromEntries(
          node.tags.map((tag: BlogTag) => [tag.name, tag.value]),
        )

        if (!node || !node.block) return null

        return {
          slug: tags['Original-Content-Digest'],
          path: node.id,
          timestamp: node.block.timestamp,
        }
      })
      .filter(
        (entry): entry is EntryPath => entry !== null && entry.slug !== '',
      )
      .reduce((acc: EntryPath[], current) => {
        const existingEntry = acc.find((entry) => entry.slug === current.slug)
        if (!existingEntry) return [...acc, current]

        existingEntry.timestamp = current.timestamp
        return acc
      }, [])
  }

  async getBlogEntriesFormatted(entryPaths: EntryPath[]): Promise<Blog[]> {
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

  private async mapEntry(entry: EntryPath): Promise<Blog | null> {
    try {
      const response = await this.httpService
        .get(`${this.configService.get('BLOG_DATA_API')}/${entry.path}`)
        .toPromise()
      const data = response?.data

      if (data) {
        const {
          content: { title, body },
          digest,
          authorship: { contributor },
          transactionId,
        } = data

        return this.formatEntry(
          { title, body, digest, contributor, transaction: transactionId },
          entry.slug,
          entry.timestamp || 0,
        ) as Promise<Blog>
      }

      return null
    } catch (error) {
      console.error(`Error mapping entry: ${entry.path}`, error)
      return null
    }
  }
}
