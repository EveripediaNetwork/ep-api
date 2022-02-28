import { ArgsType, Field, Int } from '@nestjs/graphql'

@ArgsType()
class PaginationArgs {
  @Field(() => Int)
  offset = 0

  @Field(() => Int)
  limit = 30
}

export default PaginationArgs
