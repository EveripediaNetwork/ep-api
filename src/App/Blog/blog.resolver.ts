import { Resolver, Query, Args, Int, Mutation } from '@nestjs/graphql'
import BlogService from './blog.service'
import { Blog } from './blog.dto'

@Resolver(() => Blog)
class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  @Query(() => [Blog], { nullable: 'items' })
  async getBlogs(): Promise<Blog[]> {
    console.log('=======', process.env.pm_id)
    return this.blogService.getBlogsFromAccounts()
  }

  @Query(() => Blog, { nullable: true })
  async getBlog(
    @Args('digest', { type: () => String }) digest: string,
  ): Promise<Blog | null> {
    console.log('=======', process.env.pm_id)
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

  //   @Query(() => [Blog], { nullable: 'items' })
  //   async getHiddenBlogs(): Promise<Blog[]> {
  //     const hiddenBlogs = await this.blogService.getHiddenBlogs()
  //     return hiddenBlogs
  //   }
}

export default BlogResolver
