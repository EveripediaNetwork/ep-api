/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing'
import { ValidWiki } from '../Store/store.service'

import IPFSValidatorService from './validator.service'

process.env.UI_URL =
  'https://alpha.everipedia.org/ https://ipfs.everipedia.org/ipfs/ https://www.youtube.com/ https://www.vimeo.com/'

jest.mock('fs')

describe('PinResolver', () => {
  let ipfsValidatorService: IPFSValidatorService
  let moduleRef: TestingModule
  const testWiki: ValidWiki = {
    id: 'komainu-(company)',
    version: 1,
    language: 'en',
    title: 'Komainu (company)',
    content:
      "**Komainu** (publicly launched 2020) is a custodian bank platform built for cryptocurrency. Komainu was developed by Global investment banking Nomura Group, hardware wallet manufacturer Ledger, and digital asset manager Coin Shares. This platform is the first hybrid custodian that provides traditional services with state-of-the-art technology that meets regulatory and institutional requirements for digital assets. It supports 20 Cryptocurrency, including Bitcoin, Ethereum, Lite coin, and Ripple..  \n  \n# Background  \n  \nIn June 17, 2020, Komainu was officially launched as a joint venture between Tokyo, Japan based financial services company Nomura Holdings, global hardware wallet manufacturer Ledger, and Channel Islands based digital asset manager Coin Shares. The name originates from the statues of Komainus that can be seen guarding the entrances of Japanese Shinto temples. Jean-Marie Mognetti, who is a Co-Founder and Chief Executive Officer of Coin Shares, is the company's CEO. Kenton Farmer, who previously worked at Credit Suisse and Hermes Fund Managers, is the Head of Operations. Andrew Morfill, who comes from serving as Global Head of Cyber Defense at Banco Santander, and developing the Cyber Intelligence division at Vodafone, is the company's Chief information security officer Officer. Susan Patterson, who formerly worked for Credit Suisse, Brevan Howard, and UBS, is the Head of Regulatory Affairs.",
    summary: 'Komainu is a custodian bank platform built for cryptocurrency ✅',
    categories: [{ id: 'protocols', title: 'Protocols' }],
    tags: [],
    metadata: [
      { id: 'page-type', value: 'Place / Location' },
      { id: 'references', value: '' },
      { id: 'facebook_profile', value: '' },
      { id: 'instagram_profile', value: '' },
      { id: 'twitter_profile', value: '' },
      { id: 'linkedin_profile', value: '' },
      { id: 'youtube_profile', value: '' },
      { id: 'commit-message', value: 'bold' },
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
  }
  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [IPFSValidatorService],
    }).compile()
    ipfsValidatorService =
      moduleRef.get<IPFSValidatorService>(IPFSValidatorService)
  })

  it('should be defined', () => {
    expect(ipfsValidatorService).toBeDefined()
  })

  it('should return true for a valid wiki', async () => {
    await expect(ipfsValidatorService.validate(testWiki, true)).resolves.toBe(
      true,
    )
  })

  it('should return false for a wrong user id', async () => {
    await expect(
      ipfsValidatorService.validate(
        testWiki,
        false,
        '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e',
      ),
    ).resolves.toBe(false)
  })

  it('should return false for wiki content having external URLs', async () => {
    const wiki: ValidWiki = {
      ...testWiki,
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut rutrum tortor id fringilla ullamcorper.[SushiSwap ](https://www.google.com) Mauris vitae enim turpis. Vivamus sed efficitur odio. Nullam consectetur malesuada purus, eget posuere massa. Morbi efficitur, mauris eget pharetra sollicitudin, nisl enim faucibus dolor, a semper risus leo suscipit ex. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Morbi dignissim suscipit augue vitae tempus. Nunc egestas dapibus elit eu auctor. Aenean ut sapien ante. Cras et lobortis dui.  \nLorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ut convallis ante. Proin ex ex, placerat eget aliquet ut, molestie ut nibh. Suspendisse malesuada metus quam, ut feugiat sapien feugiat vitae. Donec ac urna ligula. Integer vitae ipsum convallis metus mollis maximus. Maecenas risus felis, fringilla ut eleifend eu, egestas at leo.  \nCras quis sem sit amet eros posuere dictum sit amet at orci. Vestibulum nec efficitur nisi, vitae facilisis felis. Donec elementum sem ut varius volutpat. Suspendisse potenti. Nunc laoreet maximus facilisis. Suspendisse pellentesque pharetra nisi. Praesent pharetra lectus sit amet sapien facilisis molestie. Nam consequat commodo tellus suscipit maximus. Nullam id lorem augue. Donec eget lobortis diam. Curabitur eleifend elit sed consequat vestibulum. Nulla ante ligula, molestie sed ante ac, mattis sollicitudin nulla. Fusce id lobortis eros, et ultricies metus.  \nMauris odio nibh, maximus at magna sollicitudin, accumsan viverra felis. Nullam et metus pharetra, sagittis justo vitae, tempor orci. Donec ut orci at mauris fermentum fringilla ac vitae ipsum. Duis quis turpis vitae sem dignissim porta at elementum tortor. Integer eget accumsan nisl. Morbi bibendum quam a tincidunt sagittis. Pellentesque mattis, ligula quis posuere bibendum, augue mauris porta dolor, vitae interdum urna massa non nunc. Maecenas faucibus pulvinar augue, non efficitur elit semper et. Aenean efficitur purus id est malesuada vulputate. Cras facilisis elit semper rutrum aliquam. Vestibulum lorem metus, rutrum eget facilisis in, vestibulum id tortor. Aliquam et imperdiet lectus. Sed ultrices sapien purus, suscipit aliquet diam rhoncus non. Ut quis diam risus. Integer laoreet tellus ligula, quis eleifend lorem placerat at.',
    }
    await expect(ipfsValidatorService.validate(wiki, true)).resolves.toBe(false)
  })

  it('should return true for wiki content having expected URLs', async () => {
    const wiki: ValidWiki = {
      ...testWiki,
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut rutrum tortor id fringilla ullamcorper. Mauris [VIDEO](https://www.youtube.com/fjdgjj) vitae enim turpis. Vivamus sed efficitur odio. Nullam consectetur malesuada purus, eget posuere massa. Morbi efficitur, mauris eget pharetra sollicitudin, nisl enim faucibus dolor, a semper risus leo suscipit ex. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Morbi dignissim suscipit augue vitae tempus. Nunc egestas dapibus elit eu auctor. Aenean ut sapien ante. Cras et lobortis dui.  \nLorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ut convallis ante. Proin ex [VIDEO](https://www.vimeo.com/jsdfgjdf) ex, placerat eget aliquet ut, molestie ut nibh. Suspendisse malesuada metus quam, ut feugiat sapien feugiat vitae. Donec ac urna ligula. Integer vitae ipsum convallis metus mollis maximus. Maecenas risus felis, fringilla ut eleifend eu, egestas at leo.  \nCras quis sem sit amet eros posuere dictum sit amet at orci. Vestibulum nec efficitur nisi, vitae facilisis felis. Donec elementum sem ut varius volutpat. Suspendisse potenti. Nunc laoreet maximus facilisis. Suspendisse pellentesque pharetra nisi. Praesent pharetra lectus sit amet sapien facilisis molestie. Nam consequat commodo tellus suscipit maximus. Nullam id lorem augue. Donec eget lobortis diam. Curabitur eleifend elit sed consequat vestibulum. Nulla ante ligula, molestie sed ante ac, mattis sollicitudin nulla. Fusce id lobortis eros, et ultricies metus.  \nMauris odio nibh, maximus at magna sollicitudin, accumsan viverra felis. Nullam et metus pharetra, sagittis justo vitae, [IMAGE](https://ipfs.everipedia.org/ipfs/jdfjf) tempor orci. Donec ut orci at mauris fermentum fringilla ac vitae ipsum. Duis quis turpis vitae sem dignissim porta at elementum tortor. Integer eget accumsan nisl. Morbi bibendum quam a tincidunt sagittis. Pellentesque mattis, ligula quis posuere bibendum, augue mauris porta dolor, vitae interdum urna massa non nunc. Maecenas faucibus pulvinar augue, non efficitur elit semper et. Aenean efficitur purus id est malesuada vulputate. Cras facilisis elit semper rutrum aliquam. Vestibulum lorem metus, rutrum eget facilisis in, vestibulum id tortor. Aliquam et imperdiet lectus. Sed ultrices sapien purus, suscipit aliquet diam rhoncus non. Ut quis diam risus. Integer laoreet tellus ligula, quis eleifend lorem placerat at.',
    }
    await expect(ipfsValidatorService.validate(wiki, true)).resolves.toBe(true)
  })
})
