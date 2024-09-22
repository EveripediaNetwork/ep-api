import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { gql } from 'graphql-request'
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

  private async executeQuery<T>(
    query: string,
    variables: Record<string, any>,
  ): Promise<T> {
    const headers = { Origin: this.origin }
    const response = await this.httpService
      .post(this.apiUrl, { query, variables }, { headers })
      .toPromise()

    return response?.data?.data || {}
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

    const result = await this.executeQuery<{ entries: Blog[] }>(query, {
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

    const result = await this.executeQuery<{ entry: Blog }>(query, { digest })
    return result.entry || null
  }
}

export default MirrorApiService
