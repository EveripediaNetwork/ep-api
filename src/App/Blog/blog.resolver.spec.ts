import { Test, TestingModule } from '@nestjs/testing'
import { Blog } from './blog.dto'
import BlogResolver from './blog.resolver'
import BlogService from './blog.service'

describe('BlogResolver', () => {
  let blogResolver: BlogResolver
  let blogService: BlogService
  const blogs: Blog[] = [
    {
      title: 'Title1',
      slug: 'slug-1',
      body: 'Test conent of blog 1',
      digest: 'digest1',
      contributor: 'contributor1',
      transaction: 'tx1',
      timestamp: 2345678945,
      cover_image: 'image1.jpg',
      image_sizes: 50,
    },
    {
      title: 'Title2',
      slug: 'slug-2',
      body: 'Test content of blog 2',
      digest: 'digest2',
      contributor: 'contributor2',
      transaction: 'tx2',
      timestamp: 9867543213,
      cover_image: 'image2.jpg',
      image_sizes: 50,
    },
  ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogResolver,
        {
          provide: BlogService,
          useValue: {
            getBlogsFromAccounts: jest.fn().mockResolvedValue(blogs),
            getBlogByDigest: jest.fn((digest: string) =>
              Promise.resolve(
                blogs.find((blog) => blog.digest === digest) || null,
              ),
            ),
          },
        },
      ],
    }).compile()

    blogResolver = module.get<BlogResolver>(BlogResolver)
    blogService = module.get<BlogService>(BlogService)
  })

  describe('getBlogs', () => {
    it('should return an array of blogs', async () => {
      const result = await blogResolver.getBlogs()
      expect(result).toEqual(blogs)
      expect(blogService.getBlogsFromAccounts).toHaveBeenCalledTimes(1)
    })
  })

  describe('getBlog', () => {
    it('should return a blog by digest', async () => {
      const digest = 'digest1'
      const result = await blogResolver.getBlog(digest)
      expect(result).toEqual(blogs[0])
      expect(blogService.getBlogByDigest).toHaveBeenCalledWith(digest)
    })

    it('should return null if blog is not found', async () => {
      const digest = 'nonexistent'
      const result = await blogResolver.getBlog(digest)
      expect(result).toBeNull()
      expect(blogService.getBlogByDigest).toHaveBeenCalledWith(digest)
    })
  })
})
