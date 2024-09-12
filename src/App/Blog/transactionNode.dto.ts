import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { Block, BlockInput, BlogTag, BlogTagInput } from './block.dto'

@ObjectType()
export class TransactionNode {
  @Field(() => String)
  id = ''

  @Field(() => [BlogTag])
  tags: BlogTag[] = []

  @Field(() => Block, { nullable: true })
  block?: Block
}
@InputType()
export class TransactionNodeInput {
  @Field(() => String)
  id = ''

  @Field(() => [BlogTagInput])
  tags: BlogTagInput[] = []

  @Field(() => BlockInput, { nullable: true })
  block?: BlockInput
}
