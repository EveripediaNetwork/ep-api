import { Injectable } from '@nestjs/common'
import { Between, DataSource, Repository } from 'typeorm'
import Treasury from '../../Database/Entities/treasury.entity'

const startDate = new Date('2023-01-01')
const endDate = new Date('2023-12-31')

@Injectable()
class TreasuryRepository extends Repository<Treasury> {
  constructor(private dataSource: DataSource) {
    super(Treasury, dataSource.createEntityManager())
  }

  async saveData(tokenValue: string): Promise<Treasury> {
    const newTreasuryValue = this.create({ totalValue: tokenValue })
    return this.save(newTreasuryValue)
  }

  async getDailyTreasuryValue(): Promise<Treasury[]> {
    return this.find({
      where: {
        created: Between(startDate, endDate),
      },
    })
  }
}

export default TreasuryRepository
