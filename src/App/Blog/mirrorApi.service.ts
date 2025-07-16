import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { gql } from 'graphql-request'
import { lastValueFrom } from 'rxjs'
import { Blog } from './blog.dto'

@Injectable()
class MirrorApiService {
  private readonly logger = new Logger(MirrorApiService.name)

  private readonly apiUrl: string

  private readonly origin: string

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl =
      this.configService.get<string>('MIRROR_API_URL') ||
      'https://mirror-api.com/graphql'
    this.origin =
      this.configService.get<string>('MIRROR_API_ORIGIN') ||
      'https://mirror.xyz'
  }

  private async executeQuery(query: string, variables: Record<string, any>) {
    if (!query?.trim()) {
      this.logger.error('Query is empty or invalid')
      return null
    }

    const headers = { Origin: this.origin }

    try {
      const response = await lastValueFrom(
        this.httpService.post(this.apiUrl, { query, variables }, { headers }),
      )

      const data = response?.data?.data

      // Check for GraphQL errors
      if (response?.data?.errors?.length > 0) {
        this.logger.warn('GraphQL errors returned:', response.data.errors)
      }

      return data || null
    } catch (error) {
      this.logger.error('Query execution failed:', error)
      return null
    }
  }

  async getBlogs(address: string): Promise<Blog[]> {
    if (!address?.trim()) {
      this.logger.warn('No address provided for getBlogs')
      return []
    }

    const query = gql`
      query Entries($projectAddress: String!) {
        entries(projectAddress: $projectAddress) {
          ...entryDetails
        }
      }

      fragment entryDetails on entry {
        _id
        body
        digest
        timestamp
        title
        publishedAtTimestamp
        arweaveTransactionRequest {
          transactionId
        }
        publisher {
          ...publisherDetails
        }
      }

      fragment publisherDetails on PublisherType {
        project {
          ...projectDetails
        }
      }

      fragment projectDetails on ProjectType {
        _id
        address
      }
    `

    try {
      const result = await this.executeQuery(query, {
        projectAddress: address.trim(),
      })

      const entries = result?.entries

      if (!Array.isArray(entries)) {
        this.logger.warn(`Invalid entries response for address ${address}`)
        return []
      }

      return entries
    } catch (error) {
      this.logger.error(`Failed to get blogs for address ${address}:`, error)
      return []
    }
  }

  async getBlog(digest: string): Promise<Blog | null> {
    if (!digest?.trim()) {
      this.logger.warn('No digest provided for getBlog')
      return null
    }

    const query = gql`
      query EntryWritingNFT($digest: String!) {
        entry(digest: $digest) {
          ...entryDetails
        }
      }

      fragment entryDetails on entry {
        _id
        body
        digest
        timestamp
        title
        arweaveTransactionRequest {
          transactionId
        }
        publisher {
          ...publisherDetails
        }
      }

      fragment publisherDetails on PublisherType {
        project {
          ...projectDetails
        }
      }

      fragment projectDetails on ProjectType {
        _id
        address
      }
    `

    try {
      const result = await this.executeQuery(query, { digest: digest.trim() })
      return result?.entry || null
    } catch (error) {
      this.logger.error(`Failed to get blog for digest ${digest}:`, error)
      return null
    }
  }
}

export default MirrorApiService
