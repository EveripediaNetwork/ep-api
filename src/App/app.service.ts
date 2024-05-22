import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
class AppService {
  constructor(private configService: ConfigService) {}

  public apiLevel(): string | undefined {
    return this.configService.get<string>('API_LEVEL')
  }
}

export default AppService
