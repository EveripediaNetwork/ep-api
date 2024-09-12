import { Resolver, Query, Args } from '@nestjs/graphql'
import BlogService from './blog.service'
import { BlogInput, FormatedBlogType } from './blog.dto'

@Resolver(() => FormatedBlogType)
class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  @Query(() => [FormatedBlogType], { name: 'blogs', nullable: 'items' })
  async getBlogs(
    @Args('args') args: BlogInput,
  ): Promise<FormatedBlogType[]> {
    return this.blogService.getBlogs(args)
  }
}

export default BlogResolver
