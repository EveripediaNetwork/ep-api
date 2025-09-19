import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan, MoreThan } from 'typeorm'
import { Draft } from '../../Database/Entities/draft.entity'
import { DraftInput } from './draft.input'
import { Cron, CronExpression } from '@nestjs/schedule'

@Injectable()
export class DraftService {
  constructor(
    @InjectRepository(Draft)
    private readonly draftRepo: Repository<Draft>,
  ) {}

  async createDraft(input: DraftInput): Promise<Draft> {
    try {
      const existingDraft = await this.draftRepo.findOne({
        where: { userId: input.userId, title: input.title },
      })

      if (existingDraft) {
        existingDraft.draft = input.draft
        existingDraft.wikiId = input.wikiId
        return this.draftRepo.save(existingDraft)
      }

      const draft = this.draftRepo.create({ ...input })
      return this.draftRepo.save(draft)
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create/update draft: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  async getDrafts(id: string, title?: string): Promise<Draft[]> {
    try {
      const expiryDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const where: any = { id, createdAt: MoreThan(expiryDate) }
      if (title) where.title = title

      return this.draftRepo.find({
        where,
        order: { createdAt: 'DESC' },
      })
    } catch (error) {
      throw new NotFoundException(
        `Failed to get drafts: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  async deleteDraft(userId: string, title: string): Promise<boolean> {
    try {
      const result = await this.draftRepo.delete({ userId, title })
      return (result.affected || 0) > 0
    } catch (error) {
      throw new Error(
        `Failed to delete draft: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  async deleteExpiredDrafts(): Promise<void> {
    try {
      const expiry = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      await this.draftRepo.delete({
        createdAt: LessThan(expiry),
      })
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete expired drafts: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredDrafts() {
    await this.deleteExpiredDrafts()
  }
}
