import { ArgsType, Field } from '@nestjs/graphql'
import { Validate } from 'class-validator'
import PaginationArgs from '../pagination.args'
import ValidStringParams from '../utils/customValidator'
import Tag from '../../Database/Entities/tag.entity'

@ArgsType()
class TagIDArgs extends PaginationArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  id!: string
}

export function eventWiki(tags: Tag[]) {
  if (!tags) {
    return false
  }
  return tags.some((e: { id: string }) => e.id === 'Events')
}

export default TagIDArgs
