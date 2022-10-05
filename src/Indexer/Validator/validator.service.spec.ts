import { Test, TestingModule } from '@nestjs/testing'
import { Connection } from 'typeorm'
import { Source } from '../../Database/Entities/media.entity'
import { ValidatorCodes } from '../../Database/Entities/types/IWiki'
import { ValidWiki } from '../Store/store.service'

import IPFSValidatorService, { ValidatorResult } from './validator.service'

process.env.UI_URL =
  'youtube.com/watch youtu.be vimeo.com alpha.everipedia.org/wiki ipfs.everipedia.org/ipfs iq.wiki/wiki'

process.env.WIDGET_NAMES = 'YOUTUBE@VID'

jest.mock('fs')

describe('PinResolver', () => {
  let ipfsValidatorService: IPFSValidatorService
  let moduleRef: TestingModule

  const oldWiki: ValidWiki = {
    id: 'test-wiki-test',
    version: 1,
    language: 'en',
    title: 'test wiki test',
    content:
      'test wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki testtest wiki test',
    summary:
      'test wiki testtest wiki testtest wiki testtest wiki testtest wiki test',
    categories: [{ id: 'cryptocurrencies', title: 'cryptocurrencies' }],
    tags: [],
    metadata: [
      { id: 'page-type', value: 'NFT' },
      { id: 'references', value: '' },
      { id: 'commit-message', value: 'New Wiki Created 🎉' },
    ],
    user: { id: '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e' },
    media: [
      {
        name: 'WhatsApp Image 2021-11-30 at 5.55.25 PM.jpeg',
        size: '0.059',
        id: 'QmQrmNX9AWeB5vPbus8eXB3CvifVDHuaMk9eGwJFFDdWya',
        source: Source.IPFS_IMG,
      },
    ],
    images: [
      {
        id: 'Qme7DJxkxBCeA3CN1812ChMrhnUJ5VLDnJYHMVuL5FK7rB',
        type: 'image/jpeg, image/png',
      },
    ],
    hidden: false,
  }
  const mockQuery = () => ({
    findOne: jest.fn().mockReturnValue(oldWiki),
  })

  const mockConnection = () => ({
    getRepository: jest.fn().mockImplementation(mockQuery),
  })

  const testWiki: ValidWiki = {
    id: 'komainu-company',
    version: 1,
    language: 'en',
    title: 'Komainu (company)',
    content:
      "**Komainu** (publicly launched 2020) is a custodian bank platform built for cryptocurrency. Komainu was developed by Global investment banking Nomura Group, hardware wallet manufacturer Ledger, and digital asset manager Coin Shares. This platform is the first hybrid custodian that provides traditional services with state-of-the-art technology that meets regulatory and institutional requirements for digital assets. It supports 20 Cryptocurrency, including Bitcoin, Ethereum, Lite coin, and Ripple..  \n  \n# Background  \n  \nIn June 17, 2020, Komainu was officially launched as a joint venture between Tokyo, Japan based financial services company Nomura Holdings, global hardware wallet manufacturer Ledger, and Channel Islands based digital asset manager Coin Shares. The name originates from the statues of Komainus that can be seen guarding the entrances of Japanese Shinto temples. Jean-Marie Mognetti, who is a Co-Founder and Chief Executive Officer of Coin Shares, is the company's CEO. Kenton Farmer, who previously worked at Credit Suisse and Hermes Fund Managers, is the Head of Operations. Andrew Morfill, who comes from serving as Global Head of Cyber Defense at Banco Santander, and developing the Cyber Intelligence division at Vodafone, is the company's Chief information security officer Officer. Susan Patterson, who formerly worked for Credit Suisse, Brevan Howard, and UBS, is the Head of Regulatory Affairs.",
    summary: 'Komainu is a custodian bank platform built for cryptocurrency ✅',
    categories: [{ id: 'protocols', title: 'Protocols' }],
    tags: [],
    metadata: [
      { id: 'page-type', value: 'generic' },
      { id: 'references', value: '' },
      { id: 'facebook_profile', value: '' },
      { id: 'instagram_profile', value: '' },
      { id: 'twitter_profile', value: '' },
      { id: 'linkedin_profile', value: '' },
      { id: 'youtube_profile', value: '' },
      { id: 'commit-message', value: 'New Wiki Created 🎉' },
      { id: 'words-changed', value: '2' },
      { id: 'percent-changed', value: '0.28' },
      { id: 'blocks-changed', value: 'content' },
    ],
    media: [],
    user: { id: '0xaCa39B187352D9805DECEd6E73A3d72ABf86E7A0' },
    images: [
      {
        id: 'Qmf3wHWXhmc5c1hi3ArDPQyhmyLVmDPBMgwduvTZMmAkco',
        type: 'image/jpeg, image/png',
      },
    ],
    hidden: false,
  }
  const result: ValidatorResult = {
    status: true,
    message: ValidatorCodes.VALID_WIKI,
  }
  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        IPFSValidatorService,
        {
          provide: Connection,
          useFactory: mockConnection,
        },
      ],
    }).compile()
    ipfsValidatorService =
      moduleRef.get<IPFSValidatorService>(IPFSValidatorService)
  })

  it('should be defined', () => {
    expect(ipfsValidatorService).toBeDefined()
  })

  it('should throw summary error, summary exceeded limit', async () => {
    const wiki = {
        ...testWiki,
      summary:
        'Mihailo Bjelic is a Co\\-Founder at Polygon \\(Matic Network\\)\\. \\[2\\] \\[3\\] Led by Bjelic along with Jaynti Kanani\\, Anurag Arjun\\, and Sandeep Nailwal\\, Polygon...........Mihailo Bjelic is a Co\\-Founder at Polygon \\(Matic Network\\)\\. \\[2\\] \\[3\\] Led by Bjelic along with Jaynti Kanani\\, Anurag Arjun\\, and Sandeep Nailwal\\,',
    } 
    expect(await ipfsValidatorService.validate(wiki, true)).toEqual({
      status: false,
      message: ValidatorCodes.SUMMARY,
    })
  })

  it('should return status true for a valid wiki', async () => {
    expect(await ipfsValidatorService.validate(testWiki, true)).toEqual(result)
  })

  it('should return status false for a wrong user id', async () => {
    expect(
      await ipfsValidatorService.validate(
        testWiki,
        false,
        '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e',
      ),
    ).toEqual({ status: false, message: ValidatorCodes.USER })
  })

  it('should return status false for a low word count', async () => {
    const wiki = {
      ...testWiki,
      content: 'Not enough words',
    }
    expect(await ipfsValidatorService.validate(wiki, true)).toEqual({
      status: false,
      message: ValidatorCodes.WORDS,
    })
  })

  it('should return status false for wiki content having external URLs', async () => {
    const wiki: ValidWiki = {
      ...testWiki,
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut rutrum tortor id fringilla ullamcorper.[SushiSwap ](https://www.google.com) Mauris vitae enim turpis. Vivamus sed efficitur odio. Nullam consectetur malesuada purus, eget posuere massa. Morbi efficitur, mauris eget pharetra sollicitudin, nisl enim faucibus dolor, a semper risus leo suscipit ex. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Morbi dignissim suscipit augue vitae tempus. Nunc egestas dapibus elit eu auctor. Aenean ut sapien ante. Cras et lobortis dui.  \nLorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ut convallis ante. Proin ex ex, placerat eget aliquet ut, molestie ut nibh. Suspendisse malesuada metus quam, ut feugiat sapien feugiat vitae. Donec ac urna ligula. Integer vitae ipsum convallis metus mollis maximus. Maecenas risus felis, fringilla ut eleifend eu, egestas at leo.  \nCras quis sem sit amet eros posuere dictum sit amet at orci. Vestibulum nec efficitur nisi, vitae facilisis felis. Donec elementum sem ut varius volutpat. Suspendisse potenti. Nunc laoreet maximus facilisis. Suspendisse pellentesque pharetra nisi. Praesent pharetra lectus sit amet sapien facilisis molestie. Nam consequat commodo tellus suscipit maximus. Nullam id lorem augue. Donec eget lobortis diam. Curabitur eleifend elit sed consequat vestibulum. Nulla ante ligula, molestie sed ante ac, mattis sollicitudin nulla. Fusce id lobortis eros, et ultricies metus.  \nMauris odio nibh, maximus at magna sollicitudin, accumsan viverra felis. Nullam et metus pharetra, sagittis justo vitae, tempor orci. Donec ut orci at mauris fermentum fringilla ac vitae ipsum. Duis quis turpis vitae sem dignissim porta at elementum tortor. Integer eget accumsan nisl. Morbi bibendum quam a tincidunt sagittis. Pellentesque mattis, ligula quis posuere bibendum, augue mauris porta dolor, vitae interdum urna massa non nunc. Maecenas faucibus pulvinar augue, non efficitur elit semper et. Aenean efficitur purus id est malesuada vulputate. Cras facilisis elit semper rutrum aliquam. Vestibulum lorem metus, rutrum eget facilisis in, vestibulum id tortor. Aliquam et imperdiet lectus. Sed ultrices sapien purus, suscipit aliquet diam rhoncus non. Ut quis diam risus. Integer laoreet tellus ligula, quis eleifend lorem placerat at.',
    }
    expect(await ipfsValidatorService.validate(wiki, true)).toEqual({
      status: false,
      message: ValidatorCodes.URL,
    })
  })

  it('should return status true for wiki content having expected URLs', async () => {
    const wiki: ValidWiki = {
      ...testWiki,
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut rutrum tortor id fringilla ullamcorper. Mauris [VIDEO](https://www.youtube.com/fjdgjj) vitae enim turpis. Vivamus sed efficitur odio. Nullam consectetur malesuada purus, eget posuere massa. Morbi efficitur, mauris eget pharetra sollicitudin, nisl enim faucibus dolor, a semper risus leo suscipit ex. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Morbi dignissim suscipit augue vitae tempus. Nunc egestas dapibus elit eu auctor. Aenean ut sapien ante. Cras et lobortis dui.  \nLorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ut convallis ante. Proin ex [VIDEO](https://www.vimeo.com/jsdfgjdf) ex, placerat eget aliquet ut, molestie ut nibh. Suspendisse malesuada metus quam, ut feugiat sapien feugiat vitae. Donec ac urna ligula. Integer vitae ipsum convallis metus mollis maximus. Maecenas risus felis, fringilla ut eleifend eu, egestas at leo.  \nCras quis sem sit amet eros posuere dictum sit amet at orci. Vestibulum nec efficitur nisi, vitae facilisis felis. Donec elementum sem ut varius volutpat. Suspendisse potenti. Nunc laoreet maximus facilisis. Suspendisse pellentesque pharetra nisi. Praesent pharetra lectus sit amet sapien facilisis molestie. Nam consequat commodo tellus suscipit maximus. Nullam id lorem augue. Donec eget lobortis diam. Curabitur eleifend elit sed consequat vestibulum. Nulla ante ligula, molestie sed ante ac, mattis sollicitudin nulla. Fusce id lobortis eros, et ultricies metus.  \nMauris odio nibh, maximus at magna sollicitudin, accumsan viverra felis. Nullam et metus pharetra, sagittis justo vitae, [IMAGE](https://ipfs.everipedia.org/ipfs/jdfjf) tempor orci. Donec ut orci at mauris fermentum fringilla ac vitae ipsum. Duis quis turpis vitae sem dignissim porta at elementum tortor. Integer eget accumsan nisl. Morbi bibendum quam a tincidunt sagittis. Pellentesque mattis, ligula quis posuere bibendum, augue mauris porta dolor, vitae interdum urna massa non nunc. Maecenas faucibus pulvinar augue, non efficitur elit semper et. Aenean efficitur purus id est malesuada vulputate. Cras facilisis elit semper rutrum aliquam. Vestibulum lorem metus, rutrum eget facilisis in, vestibulum id tortor. Aliquam et imperdiet lectus. Sed ultrices sapien purus, suscipit aliquet diam rhoncus non. Ut quis diam risus. Integer laoreet tellus ligula, quis eleifend lorem placerat at.',
    }
    expect(await ipfsValidatorService.validate(wiki, true)).toEqual(result)
  })

  it('should return status true for wiki content having expected URLs and parantheses in markdown title', async () => {
    const wiki: ValidWiki = {
      ...testWiki,
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut rutrum tortor id fringilla ullamcorper. Mauris [VIDEO](https://www.youtube.com/fjdgjj) vitae enim turpis. Vivamus sed efficitur odio. Nullam consectetur malesuada purus, eget posuere massa. Morbi efficitur, mauris eget pharetra sollicitudin, nisl enim faucibus dolor, a semper risus leo suscipit ex. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Morbi dignissim suscipit augue vitae tempus. Nunc egestas dapibus elit eu auctor. Aenean ut sapien ante. Cras et lobortis dui.  \nLorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ut convallis ante. Proin ex [VIDEO](https://www.vimeo.com/jsdfgjdf) ex, placerat eget aliquet ut, molestie ut nibh. Suspendisse malesuada metus quam, ut feugiat sapien feugiat vitae. Donec ac urna ligula. Integer vitae ipsum convallis metus mollis maximus. Maecenas risus felis, fringilla ut eleifend eu, egestas at leo.  \nCras quis sem sit amet eros posuere dictum sit amet at orci. Vestibulum nec efficitur nisi, vitae facilisis felis. Donec elementum sem ut varius volutpat. Suspendisse potenti. Nunc laoreet maximus facilisis. Suspendisse pellentesque pharetra nisi. Praesent pharetra lectus sit amet sapien facilisis molestie. Nam consequat commodo tellus suscipit maximus. Nullam id lorem augue. Donec eget lobortis diam. Curabitur eleifend elit sed consequat vestibulum. Nulla ante ligula, molestie sed ante ac, mattis sollicitudin nulla. Fusce id lobortis eros, et ultricies metus.  \nMauris odio nibh, maximus at magna sollicitudin, accumsan viverra felis. Nullam et metus pharetra, sagittis justo vitae, [IMAGE (IMAGE)](https://ipfs.everipedia.org/ipfs/jdfjf) tempor orci. Donec ut orci at mauris fermentum fringilla ac vitae ipsum. Duis quis turpis vitae sem dignissim porta at elementum tortor. Integer eget accumsan nisl. Morbi bibendum quam a tincidunt sagittis. Pellentesque mattis, ligula quis posuere bibendum, augue mauris porta dolor, vitae interdum urna massa non nunc. Maecenas faucibus pulvinar augue, non efficitur elit semper et. Aenean efficitur purus id est malesuada vulputate. Cras facilisis elit semper rutrum aliquam. Vestibulum lorem metus, rutrum eget facilisis in, vestibulum id tortor. Aliquam et imperdiet lectus. Sed ultrices sapien purus, suscipit aliquet diam rhoncus non. Ut quis diam risus. Integer laoreet tellus ligula, quis eleifend lorem placerat at.',
    }
    expect(await ipfsValidatorService.validate(wiki, true)).toEqual(result)
  })

  it('should return status true for wiki content having weird links', async () => {
    const wiki: ValidWiki = {
      ...testWiki,
      content:
        "Mantra DAO is an ecosystem built on Rio Chain, a blockchain, based on Parity Substrate. Mantra DAO poses itself as the leading gateway to cross-chain, multi-asset DeFi services. [4]\n Using the Mantra DAO platform, users can access a broad array of services:\n Multi-Asset Staking & Lending Platform: Mantra DAO provides cross-chain access to DeFi Products.\n Merit-Based Reward System: Mantra DAO incentivizes its users to support the ecosystem.\n Self-Governing Organization: Participants can vote on proposals to change the system parameters.\n In July 2020, Mantra DAO appointed Hex Trust, Asia's leading institutional digital asset custody provider, to be its custodian for its fundraising campaign. Hex Trust will store and secure all the funds raised by the Mantra DAO Foundation.\n [14] In July, LD Capital, one of the leading blockchain funds in Asia, announced their participation in the Mantra DAO Initial Membership Offering (IMO) for an undisclosed amount. [16] Mantra DAO also announced that it joined Hoo Labs and planned to list with Hoo.com directly after completing their Initial Membership Offering (IMO). [17]\n In August 2020, PLUTUS.VC, a US dollar investment fund, decided to join the growing list of Mantra DAO's institutional Investors. [19]\n On August 3, 2020, Mantra DAO entered into a strategic partnership with Consensus Labs. The partnership aimed to have the two companies closely working with one another to help develop and build out the DeFi ecosystem in China. [22]\n On August 4, 2020, Mantra DAO endorsed Chaos with Kusama. Kusama network launched in July 2019 with a set of 25 validators with the aim of progressively scaling to one thousand validator nodes. In August, Mantra DAO joined the list of laureates and entered the Kusama 1000 Validator Program. [23] \n On August 5, 2020, Mantra DAO announced Waterdrip Capital joined in with LD Capital, PLUTUS.VC, and Consensus Labs as Mantra DAO's newest institutional investor. [23] \n On August 24, 2020, Mantra DAO was accepted into Parity's Substrate Builders Program, which identifies, supports, and mentors current and potential Substrate-related projects that they identify as being visionary builders and teams. [25] \n In August 2020, Mantra DAO signed a digital Simple Agreement for Future Tokens, or SAFT, after completing know-your-customer activities with every single retail investor. SAFT is an investment contract offered by cryptocurrency developers, normally only to accredited investors. [26]\n Mantra DAO Initial Membership Offering\n Mantra DAO's IMO took place on August 1, 2020. There were over 1,300 individuals signed up for the whitelist, and the average dollar amount subscribed per individual has been over $12,000. [18]\n On August 2, 2020, Mantra DAO announced the total (locked and circulating) OM token supply would be set at 888,888,888 OM, and circulating supply at the outset of the Token Generation Event (‘TGE’) will begin at 101,111,111 OM. The supply schedule will be split into seven different buckets with emissions following the below details:\n Public Distribution (Includes Pre-IMO, and IMO rounds I, II, and III) 8.5% of total supply, or 75,555,555 OM; No lock-up; \n 75,555,555 OM will be circulating from at TGE; \n All 75,555,555 OM would be able to be staked and earn staking rewards from day 1 since TGE;\n The staking rewards emission schedule is designed so that early stakers receive a greater proportion of the staking rewards bucket, and this decreases over time.private Distribution 9% of total supply, or 80,000,000 OM; Locked-up with 6 month vesting period, with 1/6th vesting on the first day of each month;\n 13,333,333 OM would begin circulating at TGE, with another 13,333,333 OM unlocking on each of the 31st, 61st, 91st, 121st and 151st days upon TGE",
    }
    expect(await ipfsValidatorService.validate(wiki, true)).toEqual(result)
  })

  it('should return status false if metadata value fields are more than 255 chars', async () => {
    const wiki = {
      ...testWiki,
      metadata: [
        {
          id: 'page-type',
          value: 'generic',
        },
        {
          id: 'references',
          value: '',
        },
        { id: 'facebook_profile', value: '' },
        { id: 'instagram_profile', value: '' },
        { id: 'twitter_profile', value: '' },
        { id: 'linkedin_profile', value: '' },
        {
          id: 'youtube_profile',
          value:
            "**Komainu** (publicly launched 2020) is a custodian bank platform built for cryptocurrency. Komainu was developed by Global investment banking Nomura Group, hardware wallet manufacturer Ledger, and digital asset manager Coin Shares. This platform is the first hybrid custodian that provides traditional services with state-of-the-art technology that meets regulatory and institutional requirements for digital assets. It supports 20 Cryptocurrency, including Bitcoin, Ethereum, Lite coin, and Ripple..  \n  \n# Background  \n  \nIn June 17, 2020, Komainu was officially launched as a joint venture between Tokyo, Japan based financial services company Nomura Holdings, global hardware wallet manufacturer Ledger, and Channel Islands based digital asset manager Coin Shares. The name originates from the statues of Komainus that can be seen guarding the entrances of Japanese Shinto temples. Jean-Marie Mognetti, who is a Co-Founder and Chief Executive Officer of Coin Shares, is the company's CEO. Kenton Farmer, who previously worked at Credit Suisse and Hermes Fund Managers, is the Head of Operations. Andrew Morfill, who comes from serving as Global Head of Cyber Defense at Banco Santander, and developing the Cyber Intelligence division at Vodafone, is the company's Chief information security officer Officer. Susan Patterson, who formerly worked for Credit Suisse, Brevan Howard, and UBS, is the Head of Regulatory Affairs. ",
        },
        { id: 'commit-message', value: 'New Wiki Created 🎉' },
      ],
    }
    expect(await ipfsValidatorService.validate(wiki, true)).toEqual({
      status: false,
      message: ValidatorCodes.METADATA,
    })
  })

  it('should return status true if wiki exists and content is has no changes', async () => {
    const wiki = {
      ...oldWiki,
    }
    expect(await ipfsValidatorService.validate(wiki, true)).toEqual(result)
  })

  it('should return status false if wiki image is null or not a valid hash', async () => {
    const wiki = {
      ...oldWiki,
      images: [
        {
          id: '',
          type: 'image/jpeg, image/png',
        },
      ],
    }

    expect(await ipfsValidatorService.validate(wiki, true)).toEqual({
      status: false,
      message: ValidatorCodes.IMAGE,
    })
  })

  it('should return status false if wiki ID is not a valid slug', async () => {
    const wiki = {
      ...testWiki,
      id: 'komainu-(company)',
    }

    expect(await ipfsValidatorService.validate(wiki, true)).toEqual({
      status: false,
      message: ValidatorCodes.ID,
    })
  })

  it('should return status true for valid media', async () => {
    const wiki = {
      ...testWiki,
      media: [
        {
          name: 'Myblockchainjobs.jpg',
          id: 'QmQL77TKW2wD9yWN6a8aXuM2N1YFT4K5NZbVq5Mf3V1GXF',
          size: '0.022',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmWkrRz6ysPnKjcH18RtgFeXCMzrGW4Y1WVeCPvRSKBnHg',
          size: '0.107',
          source: Source.IPFS_IMG,
        },
        {
          name: 'N23VH1wyylQ',
          id: 'https://www.youtube.com/watch?v=N23VH1wyylQ',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'xQaKA2uWZ_4',
          id: 'https://www.youtube.com/watch?v=xQaKA2uWZ_4',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'FKMGGfyfFmY',
          id: 'https://www.youtube.com/watch?v=FKMGGfyfFmY',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'image',
          id: 'QmRBaZ7zjCpP1jG8f8bYXh72eGQDZLRz9aHux2SHo9uRFr',
          size: '0.056',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmPYdsewJ8PyYpWY3FWnQR6s8U7PHXVctsUr5kFTpD6DM3',
          size: '0.065',
          source: Source.IPFS_IMG,
        },
      ],
    }

    expect(await ipfsValidatorService.validate(wiki, true)).toEqual(result)
  })

  it('should return status false for incorrect youtube link or invalid ipfs hash', async () => {
    const wiki = {
      ...testWiki,
      media: [
        {
          name: 'Myblockchainjobs.jpg',
          id: 'QmQL77TKW2wD9yWN6a8aXuM2N1YFT4K5NZbVq5Mf3V1',
          size: '0.022',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmWkrRz6ysPnKjcH18RtgFeXCMzrGW4Y1WVeCPvRSKBnHg',
          size: '0.107',
          source: Source.IPFS_IMG,
        },
        {
          name: 'N23VH1wyylQ',
          id: 'https://www.youtube.com/watch?v=N23VH1wyy',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'xQaKA2uWZ_4',
          id: 'https://www.youtube.com/watch?v=xQaKA2uWZ_4',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'FKMGGfyfFmY',
          id: 'https://www.youtube.com/watch?v=FKMGGfyfFmY',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'image',
          id: 'QmRBaZ7zjCpP1jG8f8bYXh72eGQDZLRz9aHux2SHo9uRFr',
          size: '0.056',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmPYdsewJ8PyYpWY3FWnQR6s8U7PHXVctsUr5kFTpD6DM3',
          size: '0.065',
          source: Source.IPFS_IMG,
        },
      ],
    }

    expect(await ipfsValidatorService.validate(wiki, true)).toEqual({
      status: false,
      message: ValidatorCodes.MEDIA,
    })
  })

  it('should return status false for invalid media length', async () => {
    const wiki = {
      ...testWiki,
      media: [
        {
          name: 'Myblockchainjobs.jpg',
          id: 'QmQL77TKW2wD9yWN6a8aXuM2N1YFT4K5NZbVq5Mf3V1GXF',
          size: '0.022',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmWkrRz6ysPnKjcH18RtgFeXCMzrGW4Y1WVeCPvRSKBnHg',
          size: '0.107',
          source: Source.IPFS_IMG,
        },
        {
          name: 'N23VH1wyylQ',
          id: 'https://www.youtube.com/watch?v=N23VH1wyylQ',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'xQaKA2uWZ_4',
          id: 'https://www.youtube.com/watch?v=xQaKA2uWZ_4',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'FKMGGfyfFmY',
          id: 'https://www.youtube.com/watch?v=FKMGGfyfFmY',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'image',
          id: 'QmRBaZ7zjCpP1jG8f8bYXh72eGQDZLRz9aHux2SHo9uRFr',
          size: '0.056',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmPYdsewJ8PyYpWY3FWnQR6s8U7PHXVctsUr5kFTpD6DM3',
          size: '0.065',
          source: Source.IPFS_IMG,
        },
        {
          name: 'N23VH1wyylQ',
          id: 'https://www.youtube.com/watch?v=N23VH1wyylQ',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'xQaKA2uWZ_4',
          id: 'https://www.youtube.com/watch?v=xQaKA2uWZ_4',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'FKMGGfyfFmY',
          id: 'https://www.youtube.com/watch?v=FKMGGfyfFmY',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'image',
          id: 'QmRBaZ7zjCpP1jG8f8bYXh72eGQDZLRz9aHux2SHo9uRFr',
          size: '0.056',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmPYdsewJ8PyYpWY3FWnQR6s8U7PHXVctsUr5kFTpD6DM3',
          size: '0.065',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmPYdsewJ8PyYpWY3FWnQR6s8U7PHXVctsUr5kFTpD6DM3',
          size: '0.065',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmRBaZ7zjCpP1jG8f8bYXh72eGQDZLRz9aHux2SHo9uRFr',
          size: '0.056',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmPYdsewJ8PyYpWY3FWnQR6s8U7PHXVctsUr5kFTpD6DM3',
          size: '0.065',
          source: Source.IPFS_IMG,
        },
        {
          name: 'N23VH1wyylQ',
          id: 'https://www.youtube.com/watch?v=N23VH1wyylQ',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'xQaKA2uWZ_4',
          id: 'https://www.youtube.com/watch?v=xQaKA2uWZ_4',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'FKMGGfyfFmY',
          id: 'https://www.youtube.com/watch?v=FKMGGfyfFmY',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'image',
          id: 'QmRBaZ7zjCpP1jG8f8bYXh72eGQDZLRz9aHux2SHo9uRFr',
          size: '0.056',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmPYdsewJ8PyYpWY3FWnQR6s8U7PHXVctsUr5kFTpD6DM3',
          size: '0.065',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmPYdsewJ8PyYpWY3FWnQR6s8U7PHXVctsUr5kFTpD6DM3',
          size: '0.065',
          source: Source.IPFS_IMG,
        },
        {
          name: 'xQaKA2uWZ_4',
          id: 'https://www.youtube.com/watch?v=xQaKA2uWZ_4',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'FKMGGfyfFmY',
          id: 'https://www.youtube.com/watch?v=FKMGGfyfFmY',
          size: '0',
          source: Source.YOUTUBE,
        },
        {
          name: 'image',
          id: 'QmRBaZ7zjCpP1jG8f8bYXh72eGQDZLRz9aHux2SHo9uRFr',
          size: '0.056',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmPYdsewJ8PyYpWY3FWnQR6s8U7PHXVctsUr5kFTpD6DM3',
          size: '0.065',
          source: Source.IPFS_IMG,
        },
        {
          name: 'image',
          id: 'QmPYdsewJ8PyYpWY3FWnQR6s8U7PHXVctsUr5kFTpD6DM3',
          size: '0.065',
          source: Source.IPFS_IMG,
        },
      ],
    }

    expect(await ipfsValidatorService.validate(wiki, true)).toEqual({
      status: false,
      message: ValidatorCodes.MEDIA,
    })
  })
})
