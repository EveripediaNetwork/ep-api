import { getMockRes } from '@jest-mock/express'
import { HttpModule } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { of } from 'rxjs'
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
    const dat = {
      revalidated: 'true',
      path: '/' as Routes,
    }

    const result: any = getMockRes({
      data: {
        revalidated: 'true',
        path: '/' as Routes,
      },
    })

    jest.spyOn(service, 'revalidate').mockResolvedValue(of(result))
    ;(await service.revalidate(Routes.HOMEPAGE)).subscribe({
      next: val => val,
      error: err => {
        throw err
      },
      complete: () => {
        expect(result.data).toEqual(dat)
      },
    })
  })
})
