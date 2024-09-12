import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Project {
  @Field(() => String, { nullable: true })
  address?: string
}
@ObjectType()
export class Publisher {
  @Field(() => Project, { nullable: true })
  project?: Project
}
