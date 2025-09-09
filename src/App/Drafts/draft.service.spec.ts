import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DraftService } from './draft.service'
import { Draft } from '../../Database/Entities/draft.entity'
import { CreateDraftInput } from './draft.input'

describe('DraftService', () => {
  let service: DraftService
  let repository: Repository<Draft>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DraftService,
        {
          provide: getRepositoryToken(Draft),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<DraftService>(DraftService)
    repository = module.get<Repository<Draft>>(getRepositoryToken(Draft))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should create a new draft', async () => {
    const createDraftInput: CreateDraftInput = {
      id: 'user123',
      title: 'Test Draft',
      wikiId: 'wiki123',
      draft: { content: 'test content' },
    }

    const mockDraft = { ...createDraftInput, createdAt: new Date() }

    mockRepository.findOne.mockResolvedValue(null)
    mockRepository.create.mockReturnValue(mockDraft)
    mockRepository.save.mockResolvedValue(mockDraft)

    const result = await service.createDraft(createDraftInput)

    expect(result).toEqual(mockDraft)
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user123', title: 'Test Draft' },
    })
    expect(mockRepository.create).toHaveBeenCalledWith(createDraftInput)
    expect(mockRepository.save).toHaveBeenCalledWith(mockDraft)
  })

  it('should update existing draft', async () => {
    const createDraftInput: CreateDraftInput = {
      id: 'user123',
      title: 'Test Draft',
      wikiId: 'wiki123',
      draft: { content: 'updated content' },
    }

    const existingDraft = {
      id: 'user123',
      title: 'Test Draft',
      wikiId: 'wiki456',
      draft: { content: 'old content' },
      createdAt: new Date(),
    }

    mockRepository.findOne.mockResolvedValue(existingDraft)
    mockRepository.save.mockResolvedValue({
      ...existingDraft,
      draft: createDraftInput.draft,
      wikiId: createDraftInput.wikiId,
    })

    const result = await service.createDraft(createDraftInput)

    expect(result.draft).toEqual(createDraftInput.draft)
    expect(result.wikiId).toEqual(createDraftInput.wikiId)
    expect(mockRepository.save).toHaveBeenCalledWith(existingDraft)
  })
})
