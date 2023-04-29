import {
  Args,
  ArgsType,
  Field,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { DataSource } from 'typeorm'
import { Validate } from 'class-validator'
import Tag from '../Database/Entities/tag.entity'
import PaginationArgs from './pagination.args'
import Wiki from '../Database/Entities/wiki.entity'
import { ITag } from '../Database/Entities/types/ITag'
import ValidStringParams from './utils/customValidator'
import { ArgsById } from './utils/queryHelpers'

@ArgsType()
class TagIDArgs extends PaginationArgs {
  @Field(() => String)
  @Validate(ValidStringParams)
  id!: string
}

@Resolver(() => Tag)
class TagResolver {
  constructor(private dataSource: DataSource) {}

  @Query(() => [Tag])
  async tags(@Args() args: PaginationArgs) {
    const repository = this.dataSource.getRepository(Tag)
    return repository.find({
      take: args.limit,
      skip: args.offset,
    })
  }

  @Query(() => Tag, { nullable: true })
  async tagById(@Args() args: ArgsById) {
    const repository = this.dataSource.getRepository(Tag)
    const tagId = await repository.findOneBy({ id: args.id })
    return tagId
  }

  @Query(() => [Tag])
  async tagsById(@Args() args: TagIDArgs) {
    const repository = this.dataSource.getRepository(Tag)
    return repository
      .createQueryBuilder('tag')
      .where('LOWER(tag.id) LIKE :id', {
        id: `%${args.id.toLowerCase()}%`,
      })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('tag.id', 'DESC')
      .getMany()
  }

  @ResolveField()
  async wikis(@Parent() tag: ITag, @Args() args: PaginationArgs) {
    const { id } = tag
    const repository = this.dataSource.getRepository(Wiki)

    return repository
      .createQueryBuilder('wiki')
      .innerJoin('wiki.tags', 'tag', 'tag.id = :tagId', {
        tagId: id,
      })
      .where('wiki.hidden = false')
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }
}

export default TagResolver
