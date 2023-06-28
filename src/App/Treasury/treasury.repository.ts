import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import Treasury from '../../Database/Entities/treasury.entity'

@Injectable()
class TreasuryRepository extends Repository<Treasury> {
  constructor(private dataSource: DataSource) {
    super(Treasury, dataSource.createEntityManager())
  }

  async saveData(tokenValue: string): Promise<Treasury> {
    const newTreasuryValue = this.create({ totalValue: tokenValue })
    return this.save(newTreasuryValue)
  }
}

export default TreasuryRepository
