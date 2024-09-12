import { Resolver, Query, Args, Int } from '@nestjs/graphql'
import { BlogService } from './blog.service'
import {
  Blog,
  BlogInput,
  EntryPathInput,
  EntryPathOutput,
  FormatedBlogType,
  RawTransactionsInput,
} from './blog.dto'
import { BadRequestException, NotFoundException } from '@nestjs/common'

@Resolver(() => FormatedBlogType)
export class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  @Query(() => [FormatedBlogType], { name: 'blogs', nullable: 'items' })
  async getBlogs(
    @Args('args') args: BlogInput,
  ): Promise<FormatedBlogType[]> {
    return this.blogService.getBlogs(args)
  }
}
