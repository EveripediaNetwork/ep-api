import { ObjectType, Field } from '@nestjs/graphql'
import { IsOptional } from 'class-validator'

@ObjectType()
export default class IpfsHash {
  @Field({ nullable: true })
  @IsOptional()
  IpfsHash?: string

  @Field({ nullable: true })
  @IsOptional()
  PinSize?: number

  @Field({ nullable: true })
  @IsOptional()
  Timestamp?: string

  @Field({ nullable: true })
  @IsOptional()
  path?: string

  @Field({ nullable: true })
  @IsOptional()
  cid?: string

  @Field({ nullable: true })
  @IsOptional()
  size?: number

  @Field({ nullable: true })
  @IsOptional()
  mode?: number
}
