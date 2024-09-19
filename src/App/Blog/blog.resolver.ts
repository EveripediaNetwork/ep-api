import { Resolver, Query, Args } from '@nestjs/graphql'
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
}

export default BlogResolver
