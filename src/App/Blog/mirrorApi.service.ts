import { Injectable } from '@nestjs/common'
import { gql } from 'graphql-request'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
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

  async getBlogs(digest: string): Promise<Blog[]> {
    const query = gql`
      query GetBlogs($projectAddress: String!) {
      entries(projectAddress: $projectAddress) {
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
            project {
            _id
              address
            }
          }
        }
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
          variables: { digest },
        },
        { headers },
      )
      .toPromise()

    return response?.data?.data?.entries || []
  }
}

export default MirrorApiService
