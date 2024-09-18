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
      if (blogs && blogs.length > 0) {
        await this.cacheManager.set(this.BLOG_CACHE_KEY, blogs, { ttl: 5000 })
      } else {
        console.error('Failed to fetch blogs from accounts')
      }
    }
    return blogs || []
  }

  @Query(() => Blog, { nullable: true })
  async getBlog(): Promise<Blog | null> {
    try {
      let blogs = await this.cacheManager.get<Blog[]>(this.BLOG_CACHE_KEY)

      if (!blogs || blogs.length === 0) {
        blogs = await this.blogService.getBlogsFromAccounts()
        if (blogs && blogs.length > 0) {
          await this.cacheManager.set(this.BLOG_CACHE_KEY, blogs, {
            ttl: this.CACHE_TTL,
          })
        } else {
          console.warn('No blogs fetched from accounts')
          return null
        }
      }

      return blogs[0] || null
    } catch (error) {
      console.error('Error fetching blog:', error)
      return null
    }
  }
}

export default BlogResolver
