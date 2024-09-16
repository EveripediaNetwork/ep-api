/* eslint-disable max-classes-per-file */
import { ObjectType, Field, Int } from '@nestjs/graphql'

@ObjectType()
export class Address {
  @Field()
  address!: string
}

@ObjectType()
export class Project {
  @Field()
  project!: Address
}

@ObjectType()
export class FormatedBlogType {
  @Field()
  title!: string

  @Field()
  slug!: string

  @Field({ nullable: true })
  body?: string

  @Field({ nullable: true })
  excerpt?: string

  @Field()
  digest!: string

  @Field()
  contributor!: string

  @Field({ nullable: true })
  timestamp?: number

  @Field({ nullable: true })
  cover_image?: string

  @Field()
  image_sizes!: number
}

@ObjectType()
export class Blog extends FormatedBlogType {
  @Field({ nullable: true })
  publishedAtTimestamp?: number

  @Field({ nullable: true })
  transaction?: string

  @Field({ nullable: true })
  publisher?: Project
}

@ObjectType()
export class EntryPathPicked {
  @Field()
  slug!: string

  @Field({ nullable: true })
  timestamp?: number
}

@ObjectType()
export class EntryPath extends EntryPathPicked {
  @Field()
  path!: string
}

@ObjectType()
export class BlogTag {
  @Field()
  name!: string

  @Field()
  value!: string
}

@ObjectType()
export class Block {
  @Field(() => Int)
  timestamp!: number
}

@ObjectType()
export class BlogNode {
  @Field()
  id!: string

  @Field(() => Block)
  block!: Block | null

  @Field(() => [BlogTag])
  tags!: BlogTag[]
}

@ObjectType()
export class TransactionEdge {
  @Field(() => BlogNode)
  node!: BlogNode | null
}

@ObjectType()
export class TransactionsEdges {
  @Field(() => [TransactionEdge])
  edges!: TransactionEdge[]
}

@ObjectType()
export class RawTransactions {
  @Field(() => TransactionsEdges)
  transactions!: TransactionsEdges
}

@ObjectType()
export class BlogPostType {
  @Field({ nullable: true })
  maxW?: string

  @Field(() => Blog)
  post!: Blog

  @Field(() => Int)
  key!: number
}
