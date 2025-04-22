import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ethers } from 'ethers'

@Injectable()
class ETHProviderService {
  constructor(private readonly configService: ConfigService) {}

  public etherScanApiKey(): string {
    return this.configService.get<string>('etherScanApiKey') as string
  }

  public providerUrl(): string {
    return this.configService.get<string>('PROVIDER_NETWORK') as string
  }

  public getRpcProvider(): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider(this.providerUrl())
  }

  // TODO: back off if no network, log error to discord
  public async checkNetwork(): Promise<void> {
    const rpcProvider = this.getRpcProvider()
    try {
      await rpcProvider.getNetwork()
    } catch (error: any) {
      console.error(error)
      if (error.message.includes('could not detect network')) {
        throw new Error(
          `${ETHProviderService.name} RPC failure - could not detect network`,
        )
      }
    }
  }
}

export default ETHProviderService
