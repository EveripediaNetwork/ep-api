import { Resolver, Query } from '@nestjs/graphql'
import { Cache } from 'cache-manager'
import { CACHE_MANAGER, Inject } from '@nestjs/common'
import BlogService from './blog.service'
import { Blog } from './blog.dto'

@Resolver(() => Blog)
class BlogResolver {
  private BLOG_CACHE_KEY = 'blog-cache'

  private CACHE_TTL = 5000

  constructor(
    private readonly blogService: BlogService,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Query(() => [Blog], { nullable: 'items' })
  async getBlogs(): Promise<Blog[]> {
    let blogs = await this.cacheManager.get<Blog[]>(this.BLOG_CACHE_KEY)

    if (!blogs) {
      blogs = await this.blogService.getBlogsFromAccounts()
      await this.cacheManager.set(this.BLOG_CACHE_KEY, blogs, { ttl: 5000 })
    }

    return blogs
  }
}

export default BlogResolver
