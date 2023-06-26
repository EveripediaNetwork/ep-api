import { Injectable } from '@nestjs/common'
import { Repository, DataSource } from 'typeorm'
import Newsletter from '../../Database/Entities/newsletter.entity'

@Injectable()
class NewsletterRepository extends Repository<Newsletter> {
  constructor(
    private dataSource: DataSource
  ) {
    super(Newsletter, dataSource.createEntityManager())
  }

  async addNewsletterSub(email: string) {
    const newSub = this.create({ email })
    return this.save(newSub)
  }

  async removeNewsletterSub(email: string) {
    await this.createQueryBuilder()
      .delete()
      .from(Newsletter)
      .where({ email })
      .execute()
  }
}

export default NewsletterRepository
