/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import TokenValidator from './utils/validateToken'
import Category from '../Database/Entities/category.entity'

@Injectable()
class CategoryService {
  constructor(private connection: Connection) {}
  async wikisIds() {
    const repository = this.connection.getRepository(Category)
    return repository.find({
      select: ['id'],
      where: {
        hidden: false,
      },
    })
  }
}

export default CategoryService
