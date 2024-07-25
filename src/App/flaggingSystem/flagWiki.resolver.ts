import {
  Args,
  ArgsType,
  Context,
  Field,
  Mutation,
  Resolver,
} from '@nestjs/graphql'
import { Validate } from 'class-validator'
import ValidStringParams from '../utils/customValidator'
import FlagWikiService from './flagWiki.service'

@ArgsType()
class FlagWikiArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  report!: string

  @Field(() => String)
  @Validate(ValidStringParams)
  wikiId!: string

  @Field(() => String)
  @Validate(ValidStringParams)
  userId!: string
}

@Resolver(() => Boolean)
class FlagWikiResolver {
  constructor(private flagWikiService: FlagWikiService) {}

  @Mutation(() => Boolean)
  async flagWiki(@Context() ctx: any, @Args() args: FlagWikiArgs) {
    await this.flagWikiService.flagWiki({
      ...args,
      userId: args.userId || ctx.req.ip,
    })
    return true
  }
}

export default FlagWikiResolver
