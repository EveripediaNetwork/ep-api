import { Field, InputType } from '@nestjs/graphql'


@InputType()
export default class SignaturePayloadInput {
  @Field() ipfs!: string

  @Field() userAddr!: string

  @Field() deadline!: number

  @Field() v!: string

  @Field() r!: string

  @Field() s!: string
}

