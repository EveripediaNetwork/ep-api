import { Controller } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import BrainPass from '../../Database/Entities/brainPass.entity'
import BrainPassDto from './brainPass.dto'

@Controller('relayer')
class BrainPassRepository extends Repository<BrainPass> {
  constructor(private dataSource: DataSource) {
    super(BrainPass, dataSource.createEntityManager())
  }

  async findBrainPass(id: number) {
    return this.findOneBy({ nftId: id })
  }

  async createBrainPass(data: BrainPassDto) {
    const newBrainPass = this.create(data)
    return this.save(newBrainPass)
  }

  async getBrainPassByAddress(address: string): Promise<BrainPass[] | null> {
    const brainPass = this.find({ where: { address } })
    return brainPass
  }
}

export default BrainPassRepository
