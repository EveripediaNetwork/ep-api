/* eslint-disable import/no-cycle */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */
import {
  ArgsType,
  createUnionType,
  Field,
  Int,
  ObjectType,
} from '@nestjs/graphql'
import { Validate, MinLength } from 'class-validator'
import PaginationArgs from '../pagination.args'
import { ValidStringParams } from '../utils/customValidator'
import Activity from '../../Database/Entities/activity.entity'

@ArgsType()
export class UserStateArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  id!: string

  @Field(() => Boolean)
  active = true
}

@ArgsType()
export class UsersByIdArgs extends PaginationArgs {
  @Field(() => String)
  @MinLength(2)
  @Validate(ValidStringParams)
  id!: string
}

@ArgsType()
export class UsersByEditArgs extends PaginationArgs {
  @Field(() => Boolean, { nullable: true })
  edits!: boolean
}

@ArgsType()
export class GetProfileArgs {
  @Field({ nullable: true })
  @Validate(ValidStringParams)
  id?: string

  @Field({ nullable: true })
  @Validate(ValidStringParams)
  username?: string
}

@ObjectType()
export class WikiCount {
  @Field(() => Int, { defaultValue: 0 })
  count!: number
}

@ObjectType()
export class UserActivity {
  @Field(() => [Activity], { nullable: true })
  activity!: Activity[]
}

export const UserWikis = createUnionType({
  name: 'UserWikis',
  types: () => [UserActivity, WikiCount] as const,
  resolveType(value) {
    if (value.activity) {
      return 'UserActivity'
    }
    if (value.count) {
      return 'WikiCount'
    }
    return null
  },
})
