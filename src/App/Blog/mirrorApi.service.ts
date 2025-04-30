import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { gql } from 'graphql-request'
import { lastValueFrom } from 'rxjs'
import { Blog } from './blog.dto'

@Injectable()
class MirrorApiService {
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
    const headers = { Origin: this.origin }

    try {
      const response = await lastValueFrom(
        this.httpService.post(this.apiUrl, { query, variables }, { headers }),
      )

      return response?.data?.data
    } catch (error) {
      console.error('Query execution failed:', error)
      return null
    }
  }

  async getBlogs(address: string): Promise<Blog[]> {
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

    const result = await this.executeQuery(query, {
      projectAddress: address,
    })
    return result.entries || []
  }

  async getBlog(digest: string): Promise<Blog> {
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

    const result = await this.executeQuery(query, { digest })
    return result.entry || null
  }
}

export default MirrorApiService
