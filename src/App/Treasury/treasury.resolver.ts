import { Resolver } from '@nestjs/graphql'
import Treasury from '../../Database/Entities/treasury.entity'
import TreasuryRepository from './treasury.repository'

@Resolver(() => Treasury)
class TreasuryResolver {
  constructor(private treasuryRepository: TreasuryRepository) {}
}

export default TreasuryResolver
