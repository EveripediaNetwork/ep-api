import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Block {
  @Field(() => Int)
  timestamp = 1
}

@InputType()
export class BlockInput {
  @Field(() => Int)
  timestamp = 1
}

@ObjectType()
export class BlogTag {
  @Field(() => String)
  name = ''

  @Field(() => String)
  value = ''
}

@InputType()
export class BlogTagInput {
  @Field(() => String)
  name = ''

  @Field(() => String)
  value = ''
}
