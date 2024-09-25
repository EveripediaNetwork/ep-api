import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import BlogService from './blog.service'
import MirrorApiService from './mirrorApi.service'
import { Blog } from './blog.dto'

describe('BlogService', () => {
  let blogService: BlogService
  let cacheManager: Cache
  // let configService: ConfigService
  let mirrorApiService: MirrorApiService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'EVERIPEDIA_BLOG_ACCOUNT2') return 'account2'
              if (key === 'EVERIPEDIA_BLOG_ACCOUNT3') return 'account3'
              return null
            }),
          },
        },
        {
          provide: MirrorApiService,
          useValue: {
            getBlogs: jest.fn().mockResolvedValue([
              {
                title: 'title',
                slug: 'slug',
                body: 'Test body',
                digest: 'digest',
                contributor: 'contributor',
                transaction: 'transaction',
                timestamp: 1234567890,
                cover_image: 'https://example.com/image.jpg',
                image_sizes: 50,
              },
            ]),
            getBlog: jest.fn().mockResolvedValue({
              title: 'title',
              slug: 'slug',
              body: 'Test body',
              digest: 'digest',
              contributor: 'contributor',
              transaction: 'transaction',
              timestamp: 1234567890,
              cover_image: 'https://example.com/image.jpg',
              image_sizes: 50,
            }),
          },
        },
      ],
    }).compile()

    blogService = module.get<BlogService>(BlogService)
    cacheManager = module.get<Cache>(CACHE_MANAGER)
    // configService = module.get<ConfigService>(ConfigService)
    mirrorApiService = module.get<MirrorApiService>(MirrorApiService)
  })

  it('should be defined', () => {
    expect(blogService).toBeDefined()
  })

  describe('formatBlog', () => {
    it('should format a blog correctly with body', () => {
      const blog = {
        title: 'Test Blog',
        body: 'This is the body of the blog.\n\nThis is the excerpt.',
        digest: 'test-digest',
        publisher: { project: { address: 'John Doe' } },
        timestamp: 1234567890,
      }

      const result = blogService.formatBlog(blog as any, true)

      expect(result.body).toBe(
        'This is the body of the blog.\n\nThis is the excerpt.',
      )
      expect(result.excerpt).toBe('This is the excerpt.')
    })
    it('should handle null or undefined blog input gracefully', () => {
      const result = blogService.formatBlog(null)
      expect(result.title).toBe('')
      expect(result.slug).toBe('')
      expect(result.digest).toBe('')
      expect(result.contributor).toBe('')
    })
  })

  describe('getBlogsFromAccounts', () => {
    it('should return blogs from cache if available', async () => {
      const blogs: Blog[] = [
        {
          title: 'title',
          slug: 'slug',
          body: '',
          digest: '',
          contributor: '',
          transaction: '',
          timestamp: 0,
          cover_image: '',
          image_sizes: 50,
        },
      ]
      jest.spyOn(cacheManager, 'get').mockResolvedValue(blogs)

      const result = await blogService.getBlogsFromAccounts()
      expect(result).toEqual(blogs)
    })

    it('should handle empty accounts array gracefully', async () => {
      blogService.EVERIPEDIA_BLOG_ACCOUNT2 = null
      blogService.EVERIPEDIA_BLOG_ACCOUNT3 = null

      const blogs = await blogService.getBlogsFromAccounts()

      expect(mirrorApiService.getBlogs).not.toHaveBeenCalled()
      expect(blogs).toEqual([])
    })
  })

  describe('getEntryPaths', () => {
    it('should correctly map transactions to EntryPath objects when valid transactions are provided', async () => {
      const rawTransactions = {
        transactions: {
          edges: [
            {
              node: {
                id: '1',
                block: { timestamp: 1234567890 },
                tags: [{ name: 'Original-Content-Digest', value: 'digest1' }],
              },
            },
            {
              node: {
                id: '2',
                block: { timestamp: 1234567891 },
                tags: [{ name: 'Original-Content-Digest', value: 'digest2' }],
              },
            },
          ],
        },
      }

      const result = await blogService.getEntryPaths(rawTransactions)

      expect(result).toEqual([
        { slug: 'digest1', path: '1', timestamp: 1234567890 },
        { slug: 'digest2', path: '2', timestamp: 1234567891 },
      ])
    })

    it('should return an empty array when transactions have empty edges array', async () => {
      const rawTransactions = {
        transactions: {
          edges: [],
        },
      }

      const result = await blogService.getEntryPaths(rawTransactions)

      expect(result).toEqual([])
    })
  })

  describe('mapEntry', () => {
    it('should return an empty array when transactions have empty edges array', async () => {
      const rawTransactions = {
        transactions: {
          edges: [],
        },
      }

      const result = await blogService.getEntryPaths(rawTransactions)

      expect(result).toEqual([])
    })
  })

  describe('getBlogEntriesFormatted', () => {
    it('should return formatted blog entries sorted by timestamp when entryPaths are provided', async () => {
      const entryPaths = [{ path: 'path1' }, { path: 'path2' }]
      jest.spyOn(blogService, 'mapEntry').mockImplementation(async (entry) => {
        if (entry.path === 'path1') {
          return { timestamp: 2, slug: 'slug1' }
        } else {
          return { timestamp: 1, slug: 'slug2' }
        }
      })

      const result = await blogService.getBlogEntriesFormatted(entryPaths)

      expect(result).toEqual([
        { timestamp: 2, slug: 'slug1' },
        { timestamp: 1, slug: 'slug2' },
      ])
    })
    it('should return an empty array when entryPaths is empty', async () => {
      const entryPaths = []

      const result = await blogService.getBlogEntriesFormatted(entryPaths)

      expect(result).toEqual([])
    })
  })
})
