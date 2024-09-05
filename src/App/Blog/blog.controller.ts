import { Controller, Get, Param } from '@nestjs/common'
import { BlogService } from './blog.service'

@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  async getAllBlogs() {
    return await this.blogService.getBlogsFromAccounts()
  }

  @Get(':slug')
  async getBlogBySlug(@Param('slug') slug: string) {
    const blogs = await this.blogService.getBlogsFromAccounts()
    return blogs.find((blog) => blog.slug === slug)
  }
}
