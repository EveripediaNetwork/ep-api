import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository, MoreThan, LessThan } from 'typeorm'
import { DraftService } from './draft.service'
import { Draft } from '../../Database/Entities/draft.entity'
import { DraftInput } from './draft.input'

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
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createDraft', () => {
    it('should create a new draft if it does not exist', async () => {
      const draftInput: DraftInput = {
        id: 'user1',
        title: 'New Draft',
        draft: { content: 'some content' },
      }
      const expectedDraft = { ...draftInput, createdAt: new Date() }

      mockRepository.findOne.mockResolvedValue(null)
      mockRepository.create.mockReturnValue(expectedDraft)
      mockRepository.save.mockResolvedValue(expectedDraft)

      const result = await service.createDraft(draftInput)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user1', title: 'New Draft' },
      })
      expect(mockRepository.create).toHaveBeenCalledWith(draftInput)
      expect(mockRepository.save).toHaveBeenCalledWith(expectedDraft)
      expect(result).toEqual(expectedDraft)
    })

    it('should update an existing draft', async () => {
      const draftInput: DraftInput = {
        id: 'user1',
        title: 'Existing Draft',
        draft: { content: 'updated content' },
        wikiId: 'wiki1',
      }
      const existingDraft = {
        id: 'user1',
        title: 'Existing Draft',
        draft: { content: 'original content' },
        createdAt: new Date(),
      }

      mockRepository.findOne.mockResolvedValue(existingDraft)
      mockRepository.save.mockImplementation((draft) => Promise.resolve(draft))

      const result = await service.createDraft(draftInput)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user1', title: 'Existing Draft' },
      })
      expect(mockRepository.create).not.toHaveBeenCalled()
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...existingDraft,
        draft: draftInput.draft,
        wikiId: draftInput.wikiId,
      })
      expect(result.draft).toEqual({ content: 'updated content' })
    })
  })

  describe('getDrafts', () => {
    it('should return drafts for a user', async () => {
      const id = 'user1'
      const expectedDrafts = [
        {
          id,
          title: 'Draft 1',
          draft: {},
          createdAt: new Date(),
        },
      ]
      mockRepository.find.mockResolvedValue(expectedDrafts)

      const result = await service.getDrafts(id)

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { id, createdAt: MoreThan(expect.any(Date)) },
        order: { createdAt: 'DESC' },
      })
      expect(result).toEqual(expectedDrafts)
    })
  })

  describe('deleteDraft', () => {
    it('should return true when a draft is deleted', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 })
      const result = await service.deleteDraft('user1', 'Draft 1')
      expect(mockRepository.delete).toHaveBeenCalledWith({
        id: 'user1',
        title: 'Draft 1',
      })
      expect(result).toBe(true)
    })

    it('should return false when no draft is deleted', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 })
      const result = await service.deleteDraft('user1', 'Draft 1')
      expect(result).toBe(false)
    })
  })

  describe('deleteExpiredDrafts', () => {
    it('should delete expired drafts', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 5 })
      await service.deleteExpiredDrafts()
      expect(mockRepository.delete).toHaveBeenCalledWith({
        createdAt: LessThan(expect.any(Date)),
      })
    })
  })
})
