import { Test, TestingModule } from '@nestjs/testing'
import { ValidWiki } from '../Store/store.service'

import IPFSValidatorService from './validator.service'

jest.mock('fs')

describe('PinResolver', () => {
  let ipfsValidatorService: IPFSValidatorService
  let moduleRef: TestingModule
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
    const testWiki: ValidWiki = {
      id: 'lorem-ipsum-dolor-sit-amet-consectetur-adipiscing-elit.',
      version: 1,
      language: 'en',
      title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut rutrum tortor id fringilla ullamcorper. Mauris vitae enim turpis. Vivamus sed efficitur odio. Nullam consectetur malesuada purus, eget posuere massa. Morbi efficitur, mauris eget pharetra sollicitudin, nisl enim faucibus dolor, a semper risus leo suscipit ex. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Morbi dignissim suscipit augue vitae tempus. Nunc egestas dapibus elit eu auctor. Aenean ut sapien ante. Cras et lobortis dui.  \nLorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ut convallis ante. Proin ex ex, placerat eget aliquet ut, molestie ut nibh. Suspendisse malesuada metus quam, ut feugiat sapien feugiat vitae. Donec ac urna ligula. Integer vitae ipsum convallis metus mollis maximus. Maecenas risus felis, fringilla ut eleifend eu, egestas at leo.  \nCras quis sem sit amet eros posuere dictum sit amet at orci. Vestibulum nec efficitur nisi, vitae facilisis felis. Donec elementum sem ut varius volutpat. Suspendisse potenti. Nunc laoreet maximus facilisis. Suspendisse pellentesque pharetra nisi. Praesent pharetra lectus sit amet sapien facilisis molestie. Nam consequat commodo tellus suscipit maximus. Nullam id lorem augue. Donec eget lobortis diam. Curabitur eleifend elit sed consequat vestibulum. Nulla ante ligula, molestie sed ante ac, mattis sollicitudin nulla. Fusce id lobortis eros, et ultricies metus.  \nMauris odio nibh, maximus at magna sollicitudin, accumsan viverra felis. Nullam et metus pharetra, sagittis justo vitae, tempor orci. Donec ut orci at mauris fermentum fringilla ac vitae ipsum. Duis quis turpis vitae sem dignissim porta at elementum tortor. Integer eget accumsan nisl. Morbi bibendum quam a tincidunt sagittis. Pellentesque mattis, ligula quis posuere bibendum, augue mauris porta dolor, vitae interdum urna massa non nunc. Maecenas faucibus pulvinar augue, non efficitur elit semper et. Aenean efficitur purus id est malesuada vulputate. Cras facilisis elit semper rutrum aliquam. Vestibulum lorem metus, rutrum eget facilisis in, vestibulum id tortor. Aliquam et imperdiet lectus. Sed ultrices sapien purus, suscipit aliquet diam rhoncus non. Ut quis diam risus. Integer laoreet tellus ligula, quis eleifend lorem placerat at.',
      summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      categories: [{ id: 'daos', title: 'DAOs' }],
      tags: [],
      metadata: [
        { id: 'page-type', value: 'generic' },
        { id: 'references', value: '' },
        { id: 'facebook_profile', value: '' },
        { id: 'instagram_profile', value: 'instagram.com/anubra266' },
        { id: 'twitter_profile', value: 'twitter.com/anubra266' },
        { id: 'linkedin_profile', value: '' },
        { id: 'youtube_profile', value: '' },
        { id: 'coingecko_profile', value: 'coingecko.com/anubra266' },
        { id: 'commit-message', value: 'Add social links\n' },
        { id: 'words-changed', value: '2' },
        { id: 'percent-changed', value: '0.26' },
        {
          id: 'blocks-changed',
          value: 'content,instagram_profile,twitter_profile,coingecko_profile',
        },
      ],
      user: { id: '0x1Ed445A181d859d0A7Fd4c2dDDeFa23b9261b8EB' },
      images: [
        {
          id: 'QmVFV6DGxEurUq8fcqCZZPGwNMxcHh5bQmDCQwvkvigGEd',
          type: 'image/jpeg, image/png',
        },
      ],
    }
    await expect(
      ipfsValidatorService.validate(testWiki, true),
    ).resolves.toBe(true)
  })

  it('should return false for a wrong user id', async () => {
    const testWiki: ValidWiki = {
      id: 'lorem-ipsum-dolor-sit-amet-consectetur-adipiscing-elit.',
      version: 1,
      language: 'en',
      title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut rutrum tortor id fringilla ullamcorper. Mauris vitae enim turpis. Vivamus sed efficitur odio. Nullam consectetur malesuada purus, eget posuere massa. Morbi efficitur, mauris eget pharetra sollicitudin, nisl enim faucibus dolor, a semper risus leo suscipit ex. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Morbi dignissim suscipit augue vitae tempus. Nunc egestas dapibus elit eu auctor. Aenean ut sapien ante. Cras et lobortis dui.  \nLorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ut convallis ante. Proin ex ex, placerat eget aliquet ut, molestie ut nibh. Suspendisse malesuada metus quam, ut feugiat sapien feugiat vitae. Donec ac urna ligula. Integer vitae ipsum convallis metus mollis maximus. Maecenas risus felis, fringilla ut eleifend eu, egestas at leo.  \nCras quis sem sit amet eros posuere dictum sit amet at orci. Vestibulum nec efficitur nisi, vitae facilisis felis. Donec elementum sem ut varius volutpat. Suspendisse potenti. Nunc laoreet maximus facilisis. Suspendisse pellentesque pharetra nisi. Praesent pharetra lectus sit amet sapien facilisis molestie. Nam consequat commodo tellus suscipit maximus. Nullam id lorem augue. Donec eget lobortis diam. Curabitur eleifend elit sed consequat vestibulum. Nulla ante ligula, molestie sed ante ac, mattis sollicitudin nulla. Fusce id lobortis eros, et ultricies metus.  \nMauris odio nibh, maximus at magna sollicitudin, accumsan viverra felis. Nullam et metus pharetra, sagittis justo vitae, tempor orci. Donec ut orci at mauris fermentum fringilla ac vitae ipsum. Duis quis turpis vitae sem dignissim porta at elementum tortor. Integer eget accumsan nisl. Morbi bibendum quam a tincidunt sagittis. Pellentesque mattis, ligula quis posuere bibendum, augue mauris porta dolor, vitae interdum urna massa non nunc. Maecenas faucibus pulvinar augue, non efficitur elit semper et. Aenean efficitur purus id est malesuada vulputate. Cras facilisis elit semper rutrum aliquam. Vestibulum lorem metus, rutrum eget facilisis in, vestibulum id tortor. Aliquam et imperdiet lectus. Sed ultrices sapien purus, suscipit aliquet diam rhoncus non. Ut quis diam risus. Integer laoreet tellus ligula, quis eleifend lorem placerat at.',
      summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      categories: [{ id: 'daos', title: 'DAOs' }],
      tags: [],
      metadata: [
        { id: 'page-type', value: 'generic' },
        { id: 'references', value: '' },
        { id: 'facebook_profile', value: '' },
        { id: 'instagram_profile', value: 'instagram.com/anubra266' },
        { id: 'twitter_profile', value: 'twitter.com/anubra266' },
        { id: 'linkedin_profile', value: '' },
        { id: 'youtube_profile', value: '' },
        { id: 'coingecko_profile', value: 'coingecko.com/anubra266' },
        { id: 'commit-message', value: 'Add social links\n' },
        { id: 'words-changed', value: '2' },
        { id: 'percent-changed', value: '0.26' },
        {
          id: 'blocks-changed',
          value: 'content,instagram_profile,twitter_profile,coingecko_profile',
        },
      ],
      user: { id: '0x1Ed445A181d859d0A7Fd4c2dDDeFa23b9261b8EB' },
      images: [
        {
          id: 'QmVFV6DGxEurUq8fcqCZZPGwNMxcHh5bQmDCQwvkvigGEd',
          type: 'image/jpeg, image/png',
        },
      ],
    }
    await expect(
      ipfsValidatorService.validate(
        testWiki,
        false,
        '0x5456afEA3aa035088Fe1F9Aa36509B320360a89e',
      ),
    ).resolves.toBe(false)
  })
})
