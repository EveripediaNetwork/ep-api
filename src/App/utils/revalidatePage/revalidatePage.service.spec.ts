import { HttpModule } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { RevalidatePageService, Routes } from './revalidatePage.service'

describe('revalidate', () => {
  let service: RevalidatePageService
  let moduleRef: TestingModule

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        RevalidatePageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile()
    service = moduleRef.get<RevalidatePageService>(RevalidatePageService)
  })

  it('should return the object containing true with path matching "/" ', async () => {
    const data = {
      revalidated: 'true',
      path: '/' as Routes,
    }

    ;(await service.revalidate(Routes.HOMEPAGE)).subscribe((r: any) => {
      expect(r.data).toEqual(data)
    })
  })
})
