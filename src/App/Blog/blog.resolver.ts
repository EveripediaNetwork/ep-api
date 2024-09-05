import { Resolver, Query, Args } from '@nestjs/graphql'
import { BlogService } from './blog.service'
import { FormatedBlogType } from './blog.dto'

@Resolver(() => FormatedBlogType)
export class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  @Query(() => [FormatedBlogType])
  async getAllBlogs() {
    return await this.blogService.getBlogsFromAccounts()
  }

  @Query(() => FormatedBlogType, { nullable: true })
  async getBlogBySlug(@Args('slug') slug: string) {
    const blogs = await this.blogService.getBlogsFromAccounts()
    return blogs.find((blog) => blog.slug === slug)
  }
}
