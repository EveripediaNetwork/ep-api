import { InputType, Field } from '@nestjs/graphql'

@InputType()
export class CreateDraftInput {
  @Field()
  id!: string

  @Field()
  title!: string

  @Field(() => String, { nullable: true })
  wikiId?: string

  @Field(() => String)
  draft!: any
}

@InputType()
export class UpdateDraftInput {
  @Field()
  id!: string

  @Field()
  title!: string

  @Field(() => String, { nullable: true })
  wikiId?: string

  @Field(() => String)
  draft!: any
}
