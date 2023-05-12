import { ConfigService } from '@nestjs/config'
import { request } from 'graphql-request'
import GraphProviderService, { Hash, query } from './graph.service'

jest.mock('graphql-request')

describe('GraphProviderService', () => {
  let service: GraphProviderService
  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://example.com/graphql'),
  }
  const unixtime = 1620828486

  beforeEach(() => {
    jest.clearAllMocks()
    service = new GraphProviderService(
      mockConfigService as unknown as ConfigService,
    )
  })

  it('should return an array of Hashes if response is successful', async () => {
    const mockRespons = {
      ipfshashs: [
        {
          id: 'QmZS3s5epiKdPjVqhD8eSGEnL3WwDK7dGBXdRVFmJeDX84',
          block: 1234,
          createdAt: 1620828487,
          transactionHash: '0x123456789abcdef',
          userId: 'user123',
          contentId: 'content123',
        },
      ],
    }
    ;(request as jest.Mock).mockResolvedValue(mockRespons)

    const expectedHashes: Hash[] = [
      {
        id: 'QmZS3s5epiKdPjVqhD8eSGEnL3WwDK7dGBXdRVFmJeDX84',
        block: 1234,
        createdAt: 1620828487,
        transactionHash: '0x123456789abcdef',
        userId: 'user123',
        contentId: 'content123',
      },
    ]

    const result = await service.getIPFSHashesFromBlock(unixtime)
    const isValidIds = result.every((val: Hash) => val.id.length === 46)

    expect(request).toHaveBeenCalledWith('http://example.com/graphql', query, {
      unixtime,
    })
    expect(result).toEqual(expectedHashes)
    expect(isValidIds).toBe(true)
  })

  it('should return an empty array if response is unsuccessful', async () => {
    const emptyHashes: Hash[] = []
    ;(request as jest.Mock).mockResolvedValue(emptyHashes)
    const result = await service.getIPFSHashesFromBlock(unixtime)

    expect(request).toHaveBeenCalledWith('http://example.com/graphql', query, {
      unixtime,
    })
    expect(result).toEqual(emptyHashes)
  })
})
