import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import BrainPass from '../../Database/Entities/brainPass.entity'
import BrainPassDto, { BrainPassArgs } from './brainPass.dto'

@Injectable()
class BrainPassRepository extends Repository<BrainPass> {
  constructor(private dataSource: DataSource) {
    super(BrainPass, dataSource.createEntityManager())
  }

  async findBrainPass(id: number) {
    return this.findOneBy({ tokenId: id })
  }

  async createBrainPass(data: BrainPassDto) {
    const newBrainPass = this.create(data)
    return this.save(newBrainPass)
  }

  async getBrainPassByAddress(args: BrainPassArgs): Promise<BrainPass[] | null> {
    const brainPass = this.find({
      where: { owner: args.address },
      take: args.limit,
      skip: args.offset,
      order: {
        created: 'DESC',
      },
    })
    return brainPass
  }

  async getBrainPassByTxHash(
    transactionHash: string,
  ): Promise<BrainPass | null> {
    const brainPass = this.findOneBy({ transactionHash })
    return brainPass
  }
}

export default BrainPassRepository
