import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { gql } from 'graphql-request'
import { Blog } from './blog.dto'

@Injectable()
class MirrorApiService {
  private apiUrl: string

  private origin: string

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
    const headers = {
      Origin: this.origin,
    }

    const response = await this.httpService
      .post(
        this.apiUrl,
        {
          query,
          variables: { projectAddress: address },
        },
        { headers },
      )
      .toPromise()
    return response?.data?.data?.entries || []
  }
}

export default MirrorApiService
