import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import BlogService from './blog.service'
import MirrorApiService from './mirrorApi.service'
import { Blog } from './blog.dto'

describe('BlogService', () => {
  let blogService: BlogService
  let cacheManager: jest.Mocked<any>
  let configService: jest.Mocked<ConfigService>
  let mirrorApiService: jest.Mocked<MirrorApiService>
  let dataSource: jest.Mocked<DataSource>

  const blog: Blog = {
    title: 'Title',
    slug: 'slug',
    body: '![cover](https://iq.wiki/image.jpg)\n\n**This** is the excerpt\n\nContent',
    digest: 'digest',
    contributor: 'contributor',
    timestamp: 234567890,
    image_sizes: 50,
    cover_image: 'https://iq.wiki/image.jpg',
    publisher: {
      project: {
        address: 'contributor',
      },
    },
  }

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    }

    const config: { [key: string]: string } = {
      EVERIPEDIA_BLOG_ACCOUNT2: 'account2',
      EVERIPEDIA_BLOG_ACCOUNT3: 'account3',
    }

    configService = {
      get: jest.fn().mockImplementation((key: string) => config[key]),
    } as any

    mirrorApiService = {
      getBlogs: jest.fn(),
      getBlog: jest.fn(),
    } as any

    dataSource = {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
      }),
    } as unknown as DataSource

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: MirrorApiService,
          useValue: mirrorApiService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile()

    blogService = module.get<BlogService>(BlogService)
  })
  describe('formatBlog', () => {
    it('should format blog correctly with body', () => {
      const formattedBlog = blogService.formatBlog(blog, true)

      expect(formattedBlog).toEqual({
        title: 'Title',
        slug: 'Title',
        body: '![cover](https://iq.wiki/image.jpg)\n\n**This** is the excerpt\n\nContent',
        excerpt: 'This is the excerpt',
        digest: 'digest',
        contributor: 'contributor',
        timestamp: 234567890,
        cover_image: 'https://iq.wiki/image.jpg',
        image_sizes: 50,
      })
    })

    it('should format blog correctly without body', () => {
      const formattedBlog = blogService.formatBlog(blog, false)

      expect(formattedBlog).toEqual({
        title: 'Title',
        slug: 'Title',
        digest: 'digest',
        contributor: 'contributor',
        timestamp: 234567890,
        cover_image: 'https://iq.wiki/image.jpg',
        image_sizes: 50,
      })
    })
  })

  describe('getBlogsFromAccounts', () => {
    it('should return cached blogs if available', async () => {
      const cachedBlogs = [blog]
      cacheManager.get.mockResolvedValue(cachedBlogs)

      const result = await blogService.getBlogsFromAccounts()

      expect(result).toEqual(cachedBlogs)
      expect(cacheManager.get).toHaveBeenCalledWith('blog-cache')
      expect(mirrorApiService.getBlogs).not.toHaveBeenCalled()
    })

    it('should fetch and cache blogs if cache is empty', async () => {
      cacheManager.get.mockResolvedValue(null)
      const mockBlogWithTimestamp = {
        ...blog,
        publishedAtTimestamp: 234567890,
      }
      mirrorApiService.getBlogs.mockResolvedValueOnce([mockBlogWithTimestamp])
      mirrorApiService.getBlogs.mockResolvedValueOnce([])

      const result = await blogService.getBlogsFromAccounts()

      expect(result).toHaveLength(1)
      expect(cacheManager.set).toHaveBeenCalledWith(
        'blog-cache',
        [
          {
            title: 'Title',
            slug: 'Title',
            body: '![cover](https://iq.wiki/image.jpg)\n\n**This** is the excerpt\n\nContent',
            excerpt: 'This is the excerpt',
            digest: 'digest',
            contributor: 'contributor',
            timestamp: 234567890,
            cover_image: 'https://iq.wiki/image.jpg',
            image_sizes: 50,
          },
        ],
        { ttl: 7200 },
      )
    })

    it('should handle errors when fetching blogs', async () => {
      cacheManager.get.mockResolvedValue(null)
      mirrorApiService.getBlogs.mockRejectedValue(new Error('API Error'))

      const result = await blogService.getBlogsFromAccounts()

      expect(result).toEqual([])
      expect(cacheManager.set).toHaveBeenCalledWith('blog-cache', [], {
        ttl: 7200,
      })
    })
  })

  describe('getBlogByDigest', () => {
    it('should return blog from cache if available', async () => {
      const cachedBlogs = [blog]
      cacheManager.get.mockResolvedValue(cachedBlogs)

      const result = await blogService.getBlogByDigest('digest')

      expect(result).toBeDefined()
      if (result) {
        expect(result.digest).toBe('digest')
      }
      expect(mirrorApiService.getBlog).not.toHaveBeenCalled()
    })

    it('should fetch blog from API if not in cache', async () => {
      cacheManager.get.mockResolvedValue([])
      mirrorApiService.getBlog.mockResolvedValue(blog)

      const result = await blogService.getBlogByDigest('digest')

      expect(result).toBeDefined()
      if (result) {
        expect(result.digest).toBe('digest')
      }
      expect(mirrorApiService.getBlog).toHaveBeenCalledWith('digest')
    })
  })

  describe('getEntryPaths', () => {
    it('should transform transactions into entry paths', async () => {
      const transactions = {
        transactions: {
          edges: [
            {
              node: {
                id: 'transaction-id',
                block: {
                  timestamp: 234567890,
                },
                tags: [{ name: 'Original-Content-Digest', value: 'digest' }],
              },
            },
          ],
        },
      }

      const result = await blogService.getEntryPaths(transactions)

      expect(result).toEqual([
        {
          slug: 'digest',
          path: 'transaction-id',
          timestamp: 234567890,
        },
      ])
    })

    it('should filter out entries without slugs', async () => {
      const transactions = {
        transactions: {
          edges: [
            {
              node: {
                id: 'transaction-id',
                block: {
                  timestamp: 234567890,
                },
                tags: [],
              },
            },
          ],
        },
      }

      const result = await blogService.getEntryPaths(transactions)

      expect(result).toEqual([])
    })
  })
})
