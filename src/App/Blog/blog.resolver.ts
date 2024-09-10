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
  async getBlogs(): Promise<FormatedBlogType[]> {
    try {
      return await this.blogService.getBlogsFromAccounts()
    } catch (error) {
      throw new BadRequestException('Failed to fetch blogs')
    }
  }

  @Query(() => FormatedBlogType, { nullable: true })
  async getBlogBySlug(@Args('slug') slug: string) {
    try {
      const blogs = await this.blogService.getBlogsFromAccounts()
      const blog = blogs.find((blog) => blog.slug === slug)
      if (!blog) {
        throw new NotFoundException(`Blog with slug ${slug} not found`)
      }
      return blog
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      throw new BadRequestException('Failed to fetch blog')
    }
  }

  @Query(() => FormatedBlogType)
  async formatBlogEntry(
    @Args('transactionId') transactionId: string,
    @Args('timestamp', { type: () => Int }) timestamp: number,
  ): Promise<FormatedBlogType> {
    try {
      const blog = await this.blogService.fetchBlogByTransactionId(
        transactionId,
      )
      if (!blog) {
        throw new NotFoundException(
          `Blog with transaction ID ${transactionId} not found`,
        )
      }
      return this.blogService.formatEntry(blog, transactionId, timestamp)
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      throw new BadRequestException('Failed to format blog entry')
    }
  }

  @Query(() => [EntryPathOutput])
  async getEntryPaths(
    @Args('rawTransactions') rawTransactions: RawTransactionsInput,
  ): Promise<EntryPathOutput[]> {
    try {
      return await this.blogService.getEntryPaths(rawTransactions)
    } catch (error) {
      throw new BadRequestException('Failed to fetch entry paths')
    }
  }

  @Query(() => [Blog], { nullable: 'items' })
  async getBlogEntriesFormatted(
    @Args('entryPaths', { type: () => [EntryPathInput] }) entryPaths: EntryPathInput[],
  ): Promise<Blog[]> {
    try {
      return await this.blogService.getBlogEntriesFormatted(entryPaths)
    } catch (error) {
      throw new BadRequestException('Failed to fetch formatted blog entries')
    }
  }
}
