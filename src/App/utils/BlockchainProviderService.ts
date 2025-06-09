import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ethers } from 'ethers'

@Injectable()
class BlockchainProviderService {
  private readonly logger = new Logger(BlockchainProviderService.name)

  private chain: number

  private iqTestnetChain: number

  constructor(private readonly configService: ConfigService) {
    this.chain = this.configService.get<number>('CHAIN_ID') as number
    this.iqTestnetChain = this.configService.get<number>(
      'IQ_TESTNET_CHAIN_ID',
    ) as number
  }

  public etherScanApiKey(): string {
    return this.configService.get<string>('ETHERSCAN_API_KEY') as string
  }

  public etherScanApiBaseUrl(): string {
    const mainnet = this.configService.get<string>('API_LEVEL') === 'prod'
    const url = this.configService.get<string>(
      'ETHERSCAN_API_BASE_URL',
    ) as string
    return `${url}?chainid=${!mainnet ? this.iqTestnetChain : this.chain}`
  }

  public providerUrl(): string {
    return this.configService.get<string>('PROVIDER_NETWORK') as string
  }

  public getRpcProvider(): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider(this.providerUrl())
  }

  public async checkNetwork(): Promise<void> {
    const rpcProvider = this.getRpcProvider()
    try {
      await rpcProvider.getNetwork()
    } catch (error: any) {
      this.logger.error(error)
      if (error.message.includes('could not detect network')) {
        throw new Error(
          `${BlockchainProviderService.name} RPC failure - could not detect network`,
        )
      }
    }
  }
}

export default BlockchainProviderService
