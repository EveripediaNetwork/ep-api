import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

@Injectable()
export class PostHogService {
  private readonly posthogUrl: string
  private readonly apiKey: string

  constructor(private configService: ConfigService) {
    const posthogUrl = this.configService.get<string>('POSTHOG_API_URL')
    const apiKey = this.configService.get<string>('POSTHOG_API_KEY')

    if (!posthogUrl) {
      throw new Error('POSTHOG_API_URL is not defined')
    }
    if (!apiKey) {
      throw new Error('POSTHOG_API_KEY is not defined')
    }
    this.posthogUrl = posthogUrl
    this.apiKey = apiKey
  }
  async sendEvent(
    eventName: string,
    distinctId: string,
    properties: Record<string, any>,
    timestamp?: string,
  ) {
    try {
      const response = await axios.post(
        this.posthogUrl,
        {
          api_key: this.apiKey,
          event: eventName,
          properties: {
            distinct_id: distinctId,
            ...properties,
          },
          timestamp,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      )
      console.log('Event sent to PostHog:', response.data)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          'Error sending event to PostHog:',
          error.response?.data || error.message,
        )
      } else {
        console.error('Unexpected error:', error)
      }
    }
  }
}
