import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import HiIQHolder from '../../Database/Entities/hiIQHolder.entity'

@Injectable()
class HiIQHolderRepository extends Repository<HiIQHolder> {
  constructor(private dataSource: DataSource) {
    super(HiIQHolder, dataSource.createEntityManager())
  }
}

export default HiIQHolderRepository
