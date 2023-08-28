import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import IQHolderAddress from '../../Database/Entities/iqHolderAddress.entity'

@Injectable()
class IQHolderAddressRepository extends Repository<IQHolderAddress> {
  constructor(private dataSource: DataSource) {
    super(IQHolderAddress, dataSource.createEntityManager())
  }
}

export default IQHolderAddressRepository
