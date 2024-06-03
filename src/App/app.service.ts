import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
class AppService {
  constructor(private configService: ConfigService) {}

  public apiLevel(): string {
    return this.configService.get<string>('API_LEVEL') || 'prod'
  }

  public privateSigner(): boolean {
    return (
      JSON.parse(this.configService.get<string>('PRIVATE_SIGNER') as string) ||
      false
    )
  }
}

export default AppService
