import { Resolver, Query, Args, Int, Mutation } from '@nestjs/graphql'
import { CACHE_MANAGER, Inject, Post } from '@nestjs/common'
import { Cache } from 'cache-manager'
import BlogService from './blog.service'
import { Blog } from './blog.dto'

@Resolver(() => Blog)
class BlogResolver {
  constructor(
    private readonly blogService: BlogService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Query(() => [Blog], { nullable: 'items' })
  async getBlogs(): Promise<Blog[]> {
    return this.blogService.getBlogsFromAccounts()
  }

  @Query(() => Blog, { nullable: true })
  async getBlog(
    @Args('digest', { type: () => String }) digest: string,
  ): Promise<Blog | null> {
    return this.blogService.getBlogByDigest(digest)
  }

  @Query(() => [Blog])
  async getBlogSuggestions(
    @Args('limit', { type: () => Int }) limit: number,
  ): Promise<Blog[]> {
    if (limit < 1 || limit > 3) {
      throw new Error('Limit must be between 1 and 3')
    }
    return this.blogService.getBlogSuggestions(limit)
  }

  @Mutation(() => Boolean)
  async clearBlogCache(): Promise<boolean> {
    await this.cacheManager.del(this.blogService.BLOG_CACHE_KEY)
    return true
  }

  @Post('refresh-blogs')
  @Mutation(() => [Blog])
  async refreshBlogs(): Promise<Blog[]> {
    return this.blogService.getBlogsFromAccounts()
  }
}

export default BlogResolver
