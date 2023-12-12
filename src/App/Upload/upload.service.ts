import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import Upload from '../../Database/Entities/upload.entity'

@Injectable()
export default class DatabaseService {
  constructor(
    @InjectRepository(Upload)
    private readonly uploadRepository: Repository<Upload>,
  ) {}

  async saveJsonData(data: any): Promise<void> {
    const entity = this.uploadRepository.create({ data })
    await this.uploadRepository.save(entity)
    console.log('Saved upload data to the database:', data)
  }
}
