import { ArgsType, Field, Int } from '@nestjs/graphql'
import PaginationArgs from '../../pagination.args'
import { ActivityType } from '../../utils/queryHelpers'

@ArgsType()
export class ActivityArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  wikiId!: string

  @Field(() => String)
  lang = 'en'
}

@ArgsType()
export class ActivityArgsByUser extends PaginationArgs {
  @Field(() => String)
  userId!: string
}
@ArgsType()
export class ActivityByCategoryArgs extends PaginationArgs {
  @Field(() => ActivityType)
  type = ActivityType.CREATED

  @Field(() => String)
  category!: string
}

@ArgsType()
export class ByIdAndBlockArgs extends ActivityArgs {
  @Field(() => Int)
  block!: number
}
