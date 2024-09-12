import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

@InputType()
export class EntryPathInput {
  @Field(() => String)
  slug = ''

  @Field(() => String)
  path = ''

  @Field(() => Int)
  timestamp = 0
}

@ObjectType()
export class EntryPathOutput {
  @Field(() => String)
  slug = ''

  @Field(() => String)
  path = ''

  @Field(() => Int)
  timestamp = 0
}
