import { Body, Controller, Post, Req } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Controller('indexer')
class IndexerWebhookController {
  constructor(private configService: ConfigService) {}

  private keys() {
    const key = this.configService.get<string>('INDEXER_API_KEY')
    const secret = this.configService.get<string>('ALCHEMY_WEBHOOK_KEY')
    return { key, secret }
  }

  @Post('/webhook')
  async initiateStore(@Req() request: any, @Body() value: string) {
    const apiKey: string = request.headers['i-api-key']
    const alchemyKey: string = request.headers['i-alchemy-key']

    if (apiKey === this.keys().key && alchemyKey === this.keys().secret) {
      console.log(apiKey)
      console.log(alchemyKey)
    } else {
      console.log(false)
    }
  }
}
export default IndexerWebhookController
