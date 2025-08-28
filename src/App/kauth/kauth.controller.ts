import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { KakaoWebhookService } from './kauth.service'

@Controller()
export class KakaoCallbackController {
  constructor(private readonly kakaoWebhookService: KakaoWebhookService) {}
  @Get('kauth/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error) {
      console.log('❌ Kakao OAuth Error:', error)
      return res.status(HttpStatus.BAD_REQUEST).send(`
        <html>
          <head>
            <title>OAuth Error</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { color: #d32f2f; background: #ffebee; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>🚫 OAuth Error</h1>
            <div class="error"><strong>Error:</strong> ${error}</div>
          </body>
        </html>
      `)
    }

    if (!code) {
      console.log('❌ Missing authorization code')
      return res.status(HttpStatus.BAD_REQUEST).send(`
        <html>
          <head><title>Missing Code</title></head>
          <body><h1>⚠️ No authorization code received</h1></body>
        </html>
      `)
    }

    console.log('✅ Kakao OAuth Success!')
    console.log('🔑 Authorization Code:', code)
    console.log('🏷️  State:', state)

    return res.status(HttpStatus.OK).send(`
      <html>
        <head>
          <title>Kakao OAuth Success</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .success { color: #2e7d32; background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .code-box { background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; border: 2px solid #ddd; }
            .copy-btn { background: #4caf50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>🎉 Kakao OAuth Success!</h1>
          
          <div class="success">
            <strong>✅ Authentication completed!</strong><br>
            Copy the code below and use it with your local MCP server.
          </div>

          <h3>📋 Authorization Code:</h3>
          <div class="code-box" id="authCode">${code}</div>
          
          <p>
            <button class="copy-btn" onclick="copyCode()">📋 Copy Code</button>
          </p>

          <h3>🔄 Next Steps:</h3>
          <ol>
            <li>Copy the authorization code above</li>
            <li>Run: <code>exchange_auth_code</code> tool with this code</li>
            <li>Test message sending with your local MCP server</li>
          </ol>

          <script>
            function copyCode() {
              const code = document.getElementById('authCode').textContent;
              navigator.clipboard.writeText(code).then(() => {
                alert('✅ Code copied to clipboard!');
              }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = code;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('✅ Code copied to clipboard!');
              });
            }
          </script>
        </body>
      </html>
    `)
  }

  @Get('/webhook/bitcoin-price')
  async getBitcoinPrice(@Res() res: Response) {
    try {
      console.log('🪙 Bitcoin price webhook triggered')

      // Get Bitcoin price
      const bitcoinPrice = await this.kakaoWebhookService.getBitcoinPrice()

      // Send KakaoTalk message with price
      await this.kakaoWebhookService.sendBitcoinPriceMessage(bitcoinPrice)

      // Return success page
      return res.status(HttpStatus.OK).send(`
        <html>
          <head>
            <title>Bitcoin Price Sent</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .success { color: #2e7d32; background: #e8f5e8; padding: 20px; border-radius: 10px; }
              .price { font-size: 24px; font-weight: bold; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>₿ Bitcoin Price Sent!</h1>
              <div class="price">${bitcoinPrice}</div>
              <p>Check your KakaoTalk for the latest Bitcoin price update.</p>
            </div>
          </body>
        </html>
      `)
    } catch (error) {
      console.error('❌ Bitcoin price webhook error:', error)
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>❌ Error</h1>
            <p>Unable to fetch Bitcoin price. Please try again later.</p>
          </body>
        </html>
      `)
    }
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'OK',
      service: 'Kakao OAuth Callback',
      endpoint: '/kauth/callback',
      timestamp: new Date().toISOString(),
    }
  }
}
