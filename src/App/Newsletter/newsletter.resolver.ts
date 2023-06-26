import {  IsEmail } from 'class-validator'
import { Args, ArgsType, Field, Mutation, Resolver } from '@nestjs/graphql'
import Newsletter from '../../Database/Entities/newsletter.entity'
import NewsletterRepository from './newsletter.repository'

@ArgsType()
export class NewsletterArgs {
    @IsEmail()
    @Field(() => String)
    email!: string
}

@Resolver(() => Newsletter)
class NewsletterResolver {
  constructor(private repo: NewsletterRepository) {}

  @Mutation(() => Newsletter)
  async addNewsLetterSubscription(@Args() args: NewsletterArgs) {
    return this.repo.addNewsletterSub(args.email)
  }

  @Mutation(() => Boolean)
  async removeNewsLetterSubscription(@Args() args: NewsletterArgs) {
    return this.repo.removeNewsletterSub(args.email)
  }
}

export default NewsletterResolver