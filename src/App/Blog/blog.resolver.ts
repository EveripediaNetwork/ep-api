import { Resolver, Query, Args, Int, Mutation } from '@nestjs/graphql'
import BlogService from './blog.service'
import { Blog } from './blog.dto'
import HiddenBlog from './hideBlog.entity'

@Resolver(() => Blog)
class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

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
  async hideBlog(
    @Args('digest', { type: () => String }) digest: string,
  ): Promise<boolean> {
    return this.blogService.hideBlogByDigest(digest)
  }

  @Mutation(() => Boolean)
  async unhideBlog(
    @Args('digest', { type: () => String }) digest: string,
  ): Promise<boolean> {
    return this.blogService.unhideBlogByDigest(digest)
  }

  @Query(() => [Blog], { nullable: 'items' })
  async getHiddenBlogs(): Promise<Blog[]> {
    return this.blogService.getHiddenBlogs()
  }
}

export default BlogResolver
