import { getModelToken } from '@nestjs/sequelize'
import { Test, TestingModule } from '@nestjs/testing'
import IpfsHashService from './ipfs-hash.service'
import Hash from './models/hashIndex.model'

describe('IpfsHashService', () => {
  let service: IpfsHashService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpfsHashService,
        {
          provide: getModelToken(Hash),
          useValue: Hash,
        },
      ],
    }).compile()

    service = module.get<IpfsHashService>(IpfsHashService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
