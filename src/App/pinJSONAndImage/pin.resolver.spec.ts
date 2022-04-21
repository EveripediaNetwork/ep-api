import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'

import { getMockReq, getMockRes } from '@jest-mock/express'
import { createWriteStream, WriteStream } from 'fs'
import { FileUpload } from 'graphql-upload'
import { mocked } from 'jest-mock'
import * as fs from 'fs/promises'
import PinService from './pin.service'
import PinResolver from './pin.resolver'

jest.mock('fs')

describe('PinResolver', () => {
  let pinResolver: PinResolver
  let pinService: PinService
  let moduleRef: TestingModule
  fs.copyFile(
    `${process.cwd()}/test/where.png`,
    `${process.cwd()}/uploads/where.png`,
  )

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        PinResolver,
        PinService,
        {
          provide: ConfigService,
          useValue: {
            key: '',
            secret: '',
          },
        },
      ],
    }).compile()
    pinResolver = moduleRef.get<PinResolver>(PinResolver)
    pinService = moduleRef.get<PinService>(PinService)
  })

  it('should be defined', () => {
    expect(pinResolver).toBeDefined()
  })

  it('should return a IpfsHash after successful image upload', async () => {
    const mockWriteStream = {
      on: jest
        .fn()
        .mockImplementation(function mock(
          this: any,
          event: string,
          handler: () => void,
        ) {
          if (event === 'finish') {
            handler()
          }
          return this
        }),
    }
    const mockReadStream = {
      pipe: jest.fn().mockReturnValueOnce(mockWriteStream),
    }

    const image: FileUpload = {
      filename: 'where.png',
      mimetype: 'image/png',
      encoding: '7bit',
      createReadStream: jest.fn().mockReturnValueOnce(mockReadStream),
    }

    const mockContext = getMockReq<any>({
      req: {
        headers: {
          'content-length': 5000,
        },
      },
    })

    mocked(createWriteStream).mockReturnValueOnce(
      mockWriteStream as unknown as WriteStream,
    )
    const { res } = getMockRes<any>({
      data: {
        IpfsHash: 'QmWFxbSnYiZL9yfZJqZxXRpBLrgYrmUbs2Scvh3DxzcxG8',
        PinSize: 5583,
        Timestamp: '2022-03-28T21:28:14.936Z',
        isDuplicate: true,
      },
    })
    const result: any = getMockRes({
      data: {
        IpfsHash: 'QmeVmp4gYnd3QL6Qkdjo1sfwvuDwjGymSphmKYmnji75UQ',
        PinSize: 5583,
        Timestamp: '2022-03-28T21:28:14.936Z',
        isDuplicate: true,
      },
    })

    jest.spyOn(pinService, 'pinImage').mockImplementation(() => result)
    expect(await pinResolver.pinImage(image, mockContext)).toHaveProperty('res.data')
    expect(res.data).toHaveProperty('IpfsHash')
  })

  it('should return a IpfsHash after successful JSON upload', async () => {
    const data = '{ "pinName": "name", "pinTag": "tag", "pinMeta": "meta" }'
    const { res } = getMockRes<any>({
      data: {
        IpfsHash: 'QmWFxbSnYiZL9yfZJqZxXRpBLrgYrmUbs2Scvh3DxzcxG8',
        PinSize: 5583,
        Timestamp: '2022-03-28T21:28:14.936Z',
        isDuplicate: true,
      },
    })
    const result: any = getMockRes({
      data: {
        IpfsHash: 'QmeVmp4gYnd3QL6Qkdjo1sfwvuDwjGymSphmKYmnji75UQ',
        PinSize: 5583,
        Timestamp: '2022-03-28T21:28:14.936Z',
        isDuplicate: true,
      },
    })

    jest.spyOn(pinService, 'pinJSON').mockImplementation(() => result)

    expect(await pinResolver.pinJSON(data)).toHaveProperty('res.data')
    expect(res.data).toHaveProperty('IpfsHash')
  })
})
