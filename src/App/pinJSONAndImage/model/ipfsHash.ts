import { ObjectType, Field } from '@nestjs/graphql'
import { IsOptional } from 'class-validator'

@ObjectType()
export default class IpfsHash {
  @Field()
  @IsOptional()
  IpfsHash?: string

  @Field()
  @IsOptional()
  PinSize?: number

  @Field()
  @IsOptional()
  Timestamp?: string

  @Field({ nullable: true })
  @IsOptional()
  IsDuplicate?: boolean
}

