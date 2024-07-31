// import { ConfigService } from '@nestjs/config'
// import { of, throwError } from 'rxjs'
// import { Test, TestingModule } from '@nestjs/testing'
// import { HttpService } from '@nestjs/axios'
// import { TWENTY_FOUR_HOURS_AGO } from '../indexerUtils'
// import RPCProviderService from './RPCProvider.service'

// jest.mock('ethers')

// describe('RPCProviderService', () => {
//   let rpcProviderService: RPCProviderService
//   let configService: ConfigService
//   let httpService: HttpService

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         RPCProviderService,
//         {
//           provide: ConfigService,
//           useValue: {
//             get: jest.fn((key: string) => {
//               switch (key) {
//                 case 'RPC_INDEXER':
//                   return JSON.stringify({
//                     URL: 'http://localhost:7500',
//                     CHAIN: 'test',
//                   })
//                 case 'WIKI_CONTRACT_ADDRESS':
//                   return '0x12345678909as876521asdfghjk'
//                 default:
//                   return null
//               }
//             }),
//           },
//         },
//         {
//           provide: HttpService,
//           useValue: {
//             get: jest.fn(),
//           },
//         },
//       ],
//     }).compile()

//     rpcProviderService = module.get<RPCProviderService>(RPCProviderService)
//     configService = module.get<ConfigService>(ConfigService)
//     httpService = module.get<HttpService>(HttpService)
//   })

//   describe('getBlockByTimestamp', () => {
//     it('should return the block number from the API response', async () => {
//       const response = { data: { height: 433214 } }
//       jest.spyOn(httpService, 'get').mockReturnValue(of(response))
//       const block = await rpcProviderService.getBlockByTimestamp(
//         'polygon',
//         TWENTY_FOUR_HOURS_AGO,
//       )
//       expect(block).toBe(433214)
//       expect(httpService.get).toHaveBeenCalledWith(
//         `https://coins.llama.fi/block/polygon/${TWENTY_FOUR_HOURS_AGO}`,
//       )
//     })

//     it('should return 0 and log an error if the API call fails', async () => {
//       jest.spyOn(httpService, 'get').mockReturnValue(throwError('API error'))
//       jest.spyOn(console, 'error').mockImplementation(() => {})

//       const block = await rpcProviderService.getBlockByTimestamp(
//         'polygon',
//         TWENTY_FOUR_HOURS_AGO,
//       )
//       expect(block).toBe(0)
//       expect(console.error).toHaveBeenCalledWith('API error')
//     })
//   })

//   describe('checkTransaction', () => {
//     it('should return transaction info from the API response', async () => {
//       const response = { data: { status: '1', result: { hash: '0x123' } } }
//       jest.spyOn(httpService, 'get').mockReturnValue(of(response))

//       const result = await rpcProviderService.checkTransaction(
//         '0xtransactionhash',
//       )
//       expect(result).toEqual(response.data)
//       expect(httpService.get).toHaveBeenCalledWith(
//         'https://testnet.braindao.org/api?module=transaction&action=gettxinfo&txhash=0xtransactionhash',
//       )
//     })

//     it('should return an error message and log an error if the API call fails', async () => {
//       jest.spyOn(httpService, 'get').mockReturnValue(throwError('API error'))
//       jest.spyOn(console, 'error').mockImplementation(() => {})

//       const result = await rpcProviderService.checkTransaction(
//         '0xtransactionhash',
//       )
//       expect(result).toEqual({
//         message: 'Transaction not found',
//         result: null,
//         status: '0',
//       })
//       expect(console.error).toHaveBeenCalledWith('API error')
//     })
//   })
// })
