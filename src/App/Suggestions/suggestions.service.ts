import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import UserSuggestion from '../../Database/Entities/userSuggestion.entity'
import { CreateSuggestionInput, GetSuggestionsArgs } from './suggestions.dto'

@Injectable()
export default class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name)

  constructor(private readonly dataSource: DataSource) {}

  async createSuggestion(
    input: CreateSuggestionInput,
  ): Promise<UserSuggestion> {
    const repository = this.dataSource.getRepository(UserSuggestion)

    try {
      JSON.parse(input.suggestion)
    } catch (error) {
      this.logger.error('Invalid JSON in suggestion:', error)
      throw new Error('Suggestion must be valid JSON')
    }

    const existing = await repository.findOne({
      where: {
        name: input.name,
        wikiId: input.wikiId,
      },
    })

    if (existing) {
      existing.suggestion = input.suggestion
      existing.wikiTitle = input.wikiTitle
      existing.email = input.email
      existing.relevance = input.relevance
      existing.cryptoScore = input.cryptoScore

      const updated = await repository.save(existing)
      this.logger.log(
        `Updated existing suggestion ${updated.id} for name: ${input.name}, wikiId: ${input.wikiId}`,
      )
      return updated
    }

    const suggestion = repository.create({
      ...input,
    })

    const saved = await repository.save(suggestion)
    this.logger.log(
      `Created new suggestion ${saved.id} for name: ${input.name}, wikiId: ${input.wikiId}`,
    )
    return saved
  }

  async getSuggestions(args: GetSuggestionsArgs): Promise<UserSuggestion[]> {
    const repository = this.dataSource.getRepository(UserSuggestion)
    const query = repository.createQueryBuilder('suggestion')

    if (args.wikiId) {
      query.andWhere('suggestion.wikiId ILIKE :wikiId', { wikiId: args.wikiId })
    }

    if (args.name) {
      query.andWhere('suggestion.name ILIKE :name', { name: args.name })
    }

    query
      .orderBy('suggestion.createdAt', 'DESC')
      .skip(args.offset)
      .take(args.limit)

    return query.getMany()
  }
}
