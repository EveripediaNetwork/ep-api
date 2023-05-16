import { ConfigService } from '@nestjs/config'
import { Wiki } from '@everipedia/iq-utils'
import SecurityTestingService from '../securityTester'

describe('checkContent', () => {
  let service: SecurityTestingService
  let configServiceMock: ConfigService

  beforeEach(() => {
    configServiceMock = {
      get: jest.fn(),
    } as unknown as ConfigService

    service = new SecurityTestingService(configServiceMock)
  })

  const wiki = {
    id: 'mina-token',
    version: 1,
    language: 'en',
    title: 'MINA Token',
    hidden: false,
    content:
      "**Komainu** (publicly launched 2020) is a custodian bank platform built for cryptocurrency. Komainu was developed by Global investment banking Nomura Group, hardware wallet manufacturer Ledger, and digital asset manager Coin Shares. This platform is the first hybrid custodian that provides traditional services with state-of-the-art technology that meets regulatory and institutional requirements for digital assets. It supports 20 Cryptocurrency, including Bitcoin, Ethereum, Lite coin, and Ripple..  \n  \n# Background  \n  \nIn June 17, 2020, Komainu was officially launched as a joint venture between Tokyo, Japan based financial services company Nomura Holdings, global hardware wallet manufacturer Ledger, and Channel Islands based digital asset manager Coin Shares. The name originates from the statues of Komainus that can be seen guarding the entrances of Japanese Shinto temples. Jean-Marie Mognetti, who is a Co-Founder and Chief Executive Officer of Coin Shares, is the company's CEO. Kenton Farmer, who previously worked at Credit Suisse and Hermes Fund Managers, is the Head of Operations. Andrew Morfill, who comes from serving as Global Head of Cyber Defense at Banco Santander, and developing the Cyber Intelligence division at Vodafone, is the company's Chief information security officer Officer. Susan Patterson, who formerly worked for Credit Suisse, Brevan Howard, and UBS, is the Head of Regulatory Affairs.",
    summary:
      'MINA Token is the utility token of the Mina Protocol platform, used for staking, transaction fees, and block production on the network.',
    categories: [{ id: 'cryptocurrencies', title: 'Cryptocurrencies' }],
    promoted: 0,
    tags: [{ id: 'Protocols' }],
    metadata: [
      {
        id: 'references',
        value:
          '[{"id":"d7kb9p5tlu4","url":"https://minaprotocol.com/","description":"website","timestamp":1683041772891},{"id":"8y3i4abopwb","url":"https://coinmarketcap.com/currencies/mina/","description":"coinmarketcap","timestamp":1683041781665},{"id":"o6wt685q9th","url":"https://www.coingecko.com/en/coins/mina-protocol","description":"coingecko","timestamp":1683041791184},{"id":"3cza8xxl2ru","url":"https://twitter.com/MinaProtocol","description":"twitter","timestamp":1683041801537},{"id":"a7t7uskgk4","url":"https://www.coindesk.com/business/2021/05/05/lightweight-mina-blockchain-raises-187m-in-coinlist-token-sale/","description":"coindesk on 18.7milion token sale","timestamp":1683042444014},{"id":"435jk2qtdbp","url":"https://www.kraken.com/learn/what-is-mina-protocol","description":"kraken-mina protocol","timestamp":1683210513943}]',
      },
      { id: 'website', value: 'https://minaprotocol.com/' },
      {
        id: 'twitter_profile',
        value: 'https://twitter.com/MinaProtocol',
      },
      {
        id: 'previous_cid',
        value: 'Qma2HhHFtkDCbiuNd7D6bjhMTCfqGw5CAcAvtqc8UHdEFx',
      },
    ],
    user: { id: '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e' },
    media: {
      '0': {
        name: 'chart_showing_Breakdown_of_the_initial_XTZ_token_supply-2.png',
        id: 'QmRtvWLYPFhjSRcAnJdiY1ccsLKrwxUx6M3BtPk1NrvV4s',
        size: '0.22',
        type: 'GALLERY',
        source: 'IPFS_IMG',
      },
    },
    views: 1,
    events: [
      {
        title: 'Token Sale',
        description: 'Mina token sale took place in April 2021',
        type: 'CREATED',
        date: '2021-04',
        link: 'https://www.coindesk.com/business/2021/05/05/lightweight-mina-blockchain-raises-187m-in-coinlist-token-sale/',
      },
    ],
    ipfs: 'Qma2HhHFtkDCbiuNd7D6bjhMTCfqGw5CAcAvtqc8UHdEFx',
    transactionHash:
      '0xf4ef82c4c8d48791e2d924c687e60e022aca4624002469dcb9c1fa8ddee50bce',
    created: '2023-05-15T11:14:08.126Z',
    images: {
      '0': {
        id: 'QmPcQ6XyhEGrZDFzdLenkfEZuXzvBLZNNhQhwJJxaXDJ6a',
        type: 'image/jpeg, image/png',
      },
    },
    linkedWikis: {
      founders: { '0': 'arthur-breitman', '1': 'kathleen-breitman' },
      blockchains: { '0': 'tezos' },
    },
  }

  it('should return a secure result for a string input', async () => {
    const result = await service.checkContent('Hello, world!')
    expect(result.status).toBe(true)
    expect(result.message).toBe('Content secure')
    expect(result.data).toBe('Hello, world!')
  })

  it('should return a secure result for a Wiki object input', async () => {
    const result = await service.checkContent(wiki as unknown as Wiki)
    expect(result.status).toBe(true)
    expect(result.message).toBe('Content secure')
    expect(result.data).toEqual(wiki)
  })

  it('should remove any script tags', async () => {
    const maliciousInput = '<script>alert("XSS attack");</script>'
    const result = await service.checkContent(maliciousInput)
    expect(result.status).toBe(true)
    expect(result.message).toBe('Content secure')
    expect(result.data).toBe('')
  })

  it('should detect and return an insecure result for malicious JS in Wiki object input', async () => {
    const maliciousWiki = {
      ...wiki,
      content:
        'hello  " onfocus="alert(document.cookie)  http://example/?var=<SCRIPT%20a=">"%20SRC="http://attacker/xss.js"></SCRIPT> <SCRIPT SRC=https://cdn.jsdelivr.net></SCRIPT> <SCRIPT SRC=http://xss.rocks/xss.js?< B > <BODY ONLOAD=alert("XSS")> <LINK REL="stylesheet" HREF="javascript:alert("XSS");"> <META HTTP-EQUIV="refresh" CONTENT="0;url=javascript:alert("XSS");"> world  <META HTTP-EQUIV="refresh" CONTENT="0; URL=http://;URL=javascript:alert("XSS");"> <IFRAME SRC="javascript:alert("XSS");">frame</IFRAME>  <TABLE BACKGROUND="javascript:alert("bbb")">  <TABLE><TD BACKGROUND="javascript:alert("bbb")">',
    }
    const result = await service.checkContent(maliciousWiki as unknown as Wiki)
    expect(result.status).toBe(false)
    expect(result.message).toBe('Malicious JavaScript found in content')
  })
})
