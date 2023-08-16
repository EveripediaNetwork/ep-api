import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import HiIQHolderAddress from '../../Database/Entities/hiIQHolderAddress.entity'

@Injectable()
class HiIQHolderAddressRepository extends Repository<HiIQHolderAddress> {
  constructor(private dataSource: DataSource) {
    super(HiIQHolderAddress, dataSource.createEntityManager())
  }
}

export default HiIQHolderAddressRepository
