/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common'
import { Connection } from 'typeorm'
import Category from '../Database/Entities/category.entity'

@Injectable()
class CategoryService {
  constructor(private connection: Connection) {}

  async categoriesIds() {
    const repository = this.connection.getRepository(Category)
    return repository.find({
      select: ['id'],
    })
  }
}

export default CategoryService
