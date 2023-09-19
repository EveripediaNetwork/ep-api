import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import TreasuryRepository from './treasury.repository'
import {
  ContractDetailsType,
  TreasuryTokenType,
  SUPPORTED_LP_TOKENS_ADDRESSES,
  firstLevelNodeProcess,
  PROTOCOLS,
  TOKEN_MINIMUM_VALUE,
} from './treasury.dto'

@Injectable()
class TreasuryService {
  constructor(
    private repo: TreasuryRepository,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  private getTreasuryENVs() {
    return {
      debank: this.configService.get<string>('DEBANK_API_KEY'),
      treasury: this.configService.get<string>('TREASURY_ADDRESS'),
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async storeTotalValue() {
    if (firstLevelNodeProcess()) {
      const value = await this.main()
      await this.repo.saveData(`${value}`)
    }
  }

  async requestToDebank(query: string): Promise<any> {
    const url = `https://pro-openapi.debank.com/v1/user/${query}`
    try {
      const res = await this.httpService
        .get(url, {
          headers: {
            Accesskey: `${this.getTreasuryENVs().debank}`,
          },
        })
        .toPromise()
      return res?.data
    } catch (e: any) {
      console.error(e)
    }
    return null
  }

  async treasuryTokens(walletAddress: string) {
    const result = await this.requestToDebank(
      `all_token_list?id=${walletAddress}&is_all=true`,
    )
    return result
  }

  async sumTokenValues(treasuryDetails: TreasuryTokenType[]) {
    const excludedSymbols = [
      'FraxlendV1 - CRV/FRAX',
      'stkCvxFxs',
      'stkCvxFpis',
      'FraxlendV1 - FXS/FRAX',
    ]

    let totalAccountValue = 0

    const filteredDetails = treasuryDetails.filter(
      (token) =>
        token.raw_dollar > TOKEN_MINIMUM_VALUE &&
        !excludedSymbols.includes(token.id),
    )

    filteredDetails.forEach((token) => {
      if (token.raw_dollar > TOKEN_MINIMUM_VALUE) {
        totalAccountValue += token.raw_dollar
      }
    })
    return totalAccountValue
  }

  async contractProtocoldetails(id: string, protocolId: string) {
    const result = await this.requestToDebank(
      `protocol?protocol_id=${protocolId}&id=${id}&is_all=true`,
    )
    return result.portfolio_item_list[0]?.asset_token_list[0]
  }

  async lpProtocolDetails(lp: boolean, tokenId: string, protocolId: string) {
    const url = lp
      ? `protocol?id=${tokenId}&protocol_id=${protocolId}`
      : `protocol?protocol_id=${protocolId}&id=${tokenId}&is_all=true`
    const result = await this.requestToDebank(url)

    return result.portfolio_item_list
  }

  async filterContracts(
    tokens: string[],
    contractBalances: ContractDetailsType[],
  ): Promise<ContractDetailsType[]> {
    const excludedSymbols = ['FraxlendV1 - CRV/FRAX', 'stkCvxFxs']

    const filteredResult = contractBalances.filter(
      (contractDetails) =>
        tokens.includes(contractDetails.id) &&
        !excludedSymbols.includes(contractDetails.symbol),
    )

    return filteredResult
  }

  async main(): Promise<number | any> {
    const address = this.getTreasuryENVs().treasury as string
    const treasury: ContractDetailsType[] = await this.treasuryTokens(address)

    const lpTokenDetails = PROTOCOLS.map(async (protocol) =>
      this.lpProtocolDetails(true, address, protocol),
    )

    const details = treasury.map(async (token) => {
      const value = token.amount
      const dollarValue = token.price * value
      return {
        id: token.symbol,
        contractAddress: token.id,
        token: value,
        raw_dollar: dollarValue,
      }
    })

    const treasuryDetails = await Promise.all(details)
    const additionalTreasuryData: TreasuryTokenType[] = []
    const allLpTokens = await Promise.all(lpTokenDetails)
    allLpTokens.flat().forEach((lp) => {
      if (SUPPORTED_LP_TOKENS_ADDRESSES.includes(lp.pool.id)) {
        additionalTreasuryData.push({
          id: lp.pool.adapter_id,
          contractAddress: lp.pool.controller,
          raw_dollar: Number(lp.stats.asset_usd_value),
          token: lp.detail.supply_token_list.map(
            (supply: { amount: number; symbol: string }) => ({
              amount: supply.amount,
              symbol: supply.symbol,
            }),
          ),
        })
      }
    })

    const allTreasureDetails = [...treasuryDetails, ...additionalTreasuryData]

    return this.sumTokenValues(allTreasureDetails)
  }
}
export default TreasuryService
