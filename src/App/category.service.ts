/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common'
import { DataSource, MoreThan } from 'typeorm'
import Category from '../Database/Entities/category.entity'

@Injectable()
class CategoryService {
  constructor(private dataSource: DataSource) {}

  async categoriesIds() {
    const repository = this.dataSource.getRepository(Category)
    return repository.find({
      select: ['id'],
      where: {
        weight: MoreThan(0),
      },
    })
  }
}

export default CategoryService
