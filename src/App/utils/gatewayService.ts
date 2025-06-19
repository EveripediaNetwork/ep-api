import {
  Injectable,
  InternalServerErrorException,
  BadGatewayException,
  BadRequestException,
} from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'

@Injectable()
class GatewayService {
  private readonly iqGatewayUrl: string

  private readonly iqGatewayKey: string

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.iqGatewayUrl = this.configService.getOrThrow('IQ_GATEWAY_URL')
    this.iqGatewayKey = this.configService.getOrThrow('IQ_GATEWAY_KEY')
  }

  async fetchData<T>(
    apiUrl: string,
    cacheDuration = 60,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const url = new URL(this.iqGatewayUrl)
    url.searchParams.append('url', apiUrl)
    url.searchParams.append('cacheDuration', cacheDuration.toString())

    const requestHeaders = {
      'x-api-key': this.iqGatewayKey,
      ...headers,
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(url.href, { headers: requestHeaders }),
      )
      const { data } = response

      return data
    } catch (error) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof BadGatewayException ||
        error instanceof BadRequestException
      ) {
        throw error
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred while fetching from gateway.',
      )
    }
  }
}

export default GatewayService
