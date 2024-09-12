import { Field, ObjectType, Int, InputType } from '@nestjs/graphql'

@ObjectType()
export class Project {
  @Field(() => String, { nullable: true })
  address?: string
}

@ObjectType()
export class Block {
  @Field(() => Int)
  timestamp: number = 1
}

@InputType()
export class BlockInput {
  @Field(() => Int)
  timestamp: number = 1
}

@ObjectType()
export class BlogTag {
  @Field(() => String)
  name: string = ''

  @Field(() => String)
  value: string = ''
}

@InputType()
export class BlogTagInput {
  @Field(() => String)
  name: string = ''

  @Field(() => String)
  value: string = ''
}

@InputType()
export class TransactionNodeInput {
  @Field(() => String)
  id: string = ''

  @Field(() => [BlogTagInput])
  tags: BlogTagInput[] = []

  @Field(() => BlockInput, { nullable: true })
  block?: BlockInput
}

@ObjectType()
export class TransactionNode {
  @Field(() => String)
  id: string = ''

  @Field(() => [BlogTag])
  tags: BlogTag[] = []

  @Field(() => Block, { nullable: true })
  block?: Block
}

@InputType()
export class TransactionEdgeInput {
  @Field(() => TransactionNodeInput)
  node?: TransactionNodeInput
}

@InputType()
export class TransactionsInput {
  @Field(() => [TransactionEdgeInput])
  edges: TransactionEdgeInput[] = []
}

@InputType()
export class RawTransactionsInput {
  @Field(() => TransactionsInput)
  transactions?: TransactionsInput
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

@InputType()
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

@InputType()
export class BlogInput {
  @Field(() => Int, { nullable: true })
  timestamp?: number

  @Field(() => String, { nullable: true })
  transaction?: string

  @Field(() => [EntryPathInput], { nullable: true })
  entryPaths?: EntryPathInput[]

  @Field(() => RawTransactionsInput, { nullable: true })
  rawTransactions?: RawTransactionsInput

  @Field(() => String, { nullable: true })
  slug?: string
}
@InputType()
export class EntryPathInput {
  @Field(() => String)
  slug: string = ''

  @Field(() => String)
  path: string = ''

  @Field(() => Int)
  timestamp: number = 0
}

@ObjectType()
export class EntryPathOutput {
  @Field(() => String)
  slug: string = ''

  @Field(() => String)
  path: string = ''

  @Field(() => Int)
  timestamp: number = 0
}

@ObjectType()
export class FormatedBlogType {
  @Field(() => String, { nullable: true })
  title?: string

  @Field(() => String)
  slug: string = ''

  @Field(() => String, { nullable: true })
  digest?: string

  @Field(() => String)
  contributor: string = ''

  @Field(() => Int, { nullable: true })
  timestamp?: number

  @Field(() => String, { nullable: true })
  cover_image?: string | null

  @Field(() => Int)
  image_sizes: number = 1

  @Field(() => String, { nullable: true })
  body?: string

  @Field(() => String, { nullable: true })
  excerpt?: string

  @Field(() => String, { nullable: true })
  transaction?: string

  @Field(() => Int, { nullable: true })
  publishedAtTimestamp?: number
}
