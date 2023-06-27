import { Injectable } from '@nestjs/common'
import { Repository } from 'typeorm'
import Treasury from '../../Database/Entities/treasury.entity'

@Injectable()
class TreasuryRepository extends Repository<Treasury> {}

export default TreasuryRepository
