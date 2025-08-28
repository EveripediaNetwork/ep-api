import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import axios from 'axios'

@Injectable()
export class KakaoWebhookService {
  private readonly kakaoApiUrl =
    'https://kapi.kakao.com/v2/api/talk/memo/default/send'

  constructor() {}

  async getBitcoinPrice(): Promise<string> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'bitcoin',
            vs_currencies: 'usd',
            include_24hr_change: 'true',
          },
        },
      )

      const bitcoinData = response.data
      const price = bitcoinData.bitcoin.usd
      const change = bitcoinData.bitcoin.usd_24h_change
      const changeEmoji = change > 0 ? '📈' : '📉'
      const changeText =
        change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`

      return `₿ Bitcoin Price: $${price.toLocaleString()} USD ${changeEmoji} ${changeText} (24h)`
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error)
      return '❌ Unable to fetch Bitcoin price right now'
    }
  }

  async sendBitcoinPriceMessage(bitcoinPrice: string): Promise<void> {
    try {
      // Get access token from environment
      const accessToken = process.env.KAKAO_ACCESS_TOKEN

      if (!accessToken) {
        throw new Error('KAKAO_ACCESS_TOKEN not found in environment variables')
      }

      const templateObject = {
        object_type: 'text',
        text: `🤖 IQ Wiki Bot\n\n${bitcoinPrice}\n\n💡 Real-time cryptocurrency data`,
        link: {
          web_url: 'https://iq.wiki',
        },
        button_title: 'Visit IQ Wiki',
      }

      const formData = new URLSearchParams()
      formData.append('template_object', JSON.stringify(templateObject))

      const response = await axios.post(this.kakaoApiUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          Authorization: `Bearer ${accessToken}`,
        },
      })

      console.log('✅ Bitcoin price message sent to KakaoTalk')
      return response.data
    } catch (error) {
      console.error('❌ Error sending KakaoTalk message:', error)
      throw new HttpException(
        'Failed to send KakaoTalk message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
