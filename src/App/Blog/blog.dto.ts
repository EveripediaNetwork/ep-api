import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'
import { Publisher } from './project.dto'
import { EntryPathInput } from './entryPath.dto'
import { RawTransactionsInput } from './transaction.dto'

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
