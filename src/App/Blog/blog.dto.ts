/* eslint-disable max-classes-per-file */
import { Field, ObjectType, InputType, Int } from '@nestjs/graphql'

@ObjectType()
class BaseEntity {
  @Field(() => String)
  id = ''
}

@ObjectType()
class BaseNameValue {
  @Field(() => String)
  name = ''

  @Field(() => String)
  value = ''
}

@InputType()
class BaseNameValueInput extends BaseNameValue {}

@ObjectType()
export class Project {
  @Field(() => String, { nullable: true })
  address?: string
}

@ObjectType()
export class Block {
  @Field(() => Int)
  timestamp = 1
}

@InputType()
export class BlockInput extends Block {}

@ObjectType()
export class BlogTag extends BaseNameValue {}

@InputType()
export class BlogTagInput extends BaseNameValueInput {}

@ObjectType()
export class TransactionNode extends BaseEntity {
  @Field(() => [BlogTag])
  tags: BlogTag[] = []

  @Field(() => Block, { nullable: true })
  block?: Block
}


@ObjectType()
export class TransactionEdge {
  @Field(() => TransactionNode)
  node?: TransactionNode
}



@ObjectType()
export class Transactions {
  @Field(() => [TransactionEdge])
  edges: TransactionEdge[] = []
}


@ObjectType()
export class Publisher {
  @Field(() => Project, { nullable: true })
  project?: Project
}


@ObjectType()
export class RawTransactions {
  @Field(() => Transactions)
  transactions?: Transactions
}

@ObjectType()
export class Blog {
  @Field(() => String, { nullable: true })
  title?: string

  @Field(() => String, { nullable: true })
  body?: string

  @Field(() => String, { nullable: true })
  digest?: string

  @Field(() => String, { nullable: true })
  contributor?: string

  @Field(() => Publisher, { nullable: true })
  publisher?: Publisher

  @Field(() => Int, { nullable: true })
  timestamp?: number

  @Field(() => String, { nullable: true })
  transaction?: string

  @Field(() => String, { nullable: true })
  cover_image?: string

  @Field(() => Int, { nullable: true })
  publishedAtTimestamp?: number

  @Field(() => String, { nullable: true })
  slug?: string
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

@InputType()
export class EntryPathInput extends EntryPathOutput {}

@ObjectType()
export class FormatedBlogType {
  @Field(() => String, { nullable: true })
  title?: string

  @Field(() => String)
  slug = ''

  @Field(() => String, { nullable: true })
  digest?: string

  @Field(() => String)
  contributor = ''

  @Field(() => Int, { nullable: true })
  timestamp?: number

  @Field(() => String, { nullable: true })
  cover_image?: string | null

  @Field(() => Int)
  image_sizes = 1

  @Field(() => String, { nullable: true })
  body?: string

  @Field(() => String, { nullable: true })
  excerpt?: string

  @Field(() => String, { nullable: true })
  transaction?: string

  @Field(() => Int, { nullable: true })
  publishedAtTimestamp?: number
}
