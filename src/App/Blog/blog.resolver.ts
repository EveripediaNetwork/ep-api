import { Resolver, Query, Args, Int } from '@nestjs/graphql'
import { BlogService } from './blog.service'
import {
  Blog,
  EntryPathInput,
  EntryPathOutput,
  FormatedBlogType,
  RawTransactionsInput,
} from './blog.dto'
import { BadRequestException, NotFoundException } from '@nestjs/common'

@Resolver(() => FormatedBlogType)
export class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  @Query(() => [FormatedBlogType], { name: 'blogs', nullable: 'items' })
  async getBlogs(
    @Args('slug', { nullable: true }) slug?: string,
    @Args('transactionId', { nullable: true }) transactionId?: string,
    @Args('timestamp', { type: () => Int, nullable: true }) timestamp?: number,
    @Args('rawTransactions', { nullable: true }) rawTransactions?: RawTransactionsInput,
    @Args('entryPaths', { type: () => [EntryPathInput], nullable: true }) entryPaths?: EntryPathInput[],
  ): Promise<
    FormatedBlogType[] | FormatedBlogType | EntryPathOutput[] | Blog[]
  > {
    try {
      if (slug) {
        const blogs = await this.blogService.getBlogsFromAccounts()
        const blog = blogs.find((blog) => blog.slug === slug)
        if (!blog) {
          throw new NotFoundException(`Blog with slug ${slug} not found`)
        }
        return blog
      }

      if (transactionId && timestamp) {
        const blog = await this.blogService.fetchBlogByTransactionId(
          transactionId,
        )
        if (!blog) {
          throw new NotFoundException(
            `Blog with transaction ID ${transactionId} not found`,
          )
        }
        return this.blogService.formatEntry(blog, transactionId, timestamp)
      }

      if (rawTransactions) {
        return this.blogService.getEntryPaths(rawTransactions)
      }

      if (entryPaths) {
        return this.blogService.getBlogEntriesFormatted(entryPaths)
      }

      return this.blogService.getBlogsFromAccounts()
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      throw new BadRequestException('Failed to fetch or process blog data')
    }
  }
}
