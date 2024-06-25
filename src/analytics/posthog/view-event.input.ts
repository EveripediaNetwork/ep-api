import { Field, InputType } from '@nestjs/graphql'

@InputType()
export class EventPropertiesInput {
  @Field()
  key1?: string
}
