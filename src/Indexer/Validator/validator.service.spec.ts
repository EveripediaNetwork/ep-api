import { Test, TestingModule } from '@nestjs/testing'

import IPFSValidatorService from './validator.service'


jest.mock('fs')

describe('PinResolver', () => {
  let ipfsValidatorService: IPFSValidatorService
  let moduleRef: TestingModule
  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        IPFSValidatorService,

      ],
    }).compile()
    ipfsValidatorService = moduleRef.get<IPFSValidatorService>(IPFSValidatorService)
  })

  it('should be defined', () => {
    expect(ipfsValidatorService).toBeDefined()
  })
})