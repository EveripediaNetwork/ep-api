import { Resolver, Query, Args, Int } from '@nestjs/graphql'
import BlogService from './blog.service'
import { Blog } from './blog.dto'

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
    @Args('screenSize', { type: () => Int}) screenSize: number,
  ): Promise<Blog[]> {
    return this.blogService.getBlogSuggestions(screenSize)
  }
}

export default BlogResolver
