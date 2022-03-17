/* eslint-disable no-promise-executor-return */
/* eslint-disable max-classes-per-file */
import {
  Args,
  ArgsType,
  Field,
  Int,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql'
import { Connection } from 'typeorm'
import { GraphQLUpload, FileUpload } from 'graphql-upload'
import { createWriteStream } from 'fs'
import * as fs from 'fs/promises'
import Wiki from '../Database/Entities/wiki.entity'
import IpfsHash from '../model/ipfsHash'
import PaginationArgs from './pagination.args'
import WikiService from './wiki.service'

@ArgsType()
class LangArgs extends PaginationArgs {
  @Field(() => String)
  lang = 'en'
}

@ArgsType()
class TitleArgs extends LangArgs {
  @Field(() => String)
  title!: string
}

@ArgsType()
class CategoryArgs extends LangArgs {
  @Field(() => String)
  category!: string
}

@ArgsType()
class ByIdAndBlockArgs {
  @Field(() => String)
  id!: string

  @Field(() => String)
  lang = 'en'

  @Field(() => Int)
  block = -1
}

@Resolver(() => Wiki)
class WikiResolver {
  constructor(
    private connection: Connection,
    private readonly wikiService: WikiService,
  ) {}

  @Query(() => Wiki)
  async wiki(@Args() args: ByIdAndBlockArgs) {
    const repository = this.connection.getRepository(Wiki)
    const condition =
      args.block === -1
        ? {
            language: args.lang,
            id: args.id,
          }
        : {
            language: args.lang,
            id: args.id,
            block: args.block,
          }
    return repository.findOneOrFail({ where: condition })
  }

  @Query(() => Wiki)
  async wikiByIdAndBlock(@Args('id', { type: () => String }) id: number) {
    const repository = this.connection.getRepository(Wiki)
    return repository.findOneOrFail(id)
  }

  @Query(() => [Wiki])
  async wikis(@Args() args: LangArgs) {
    const repository = this.connection.getRepository(Wiki)
    return repository.find({
      where: {
        language: args.lang,
      },
      take: args.limit,
      skip: args.offset,
    })
  }

  @Query(() => [Wiki])
  async wikisByCategory(@Args() args: CategoryArgs) {
    const repository = this.connection.getRepository(Wiki)

    return repository
      .createQueryBuilder('wiki')
      .innerJoin('wiki.categories', 'category', 'category.id = :categoryId', {
        categoryId: args.category,
      })
      .where('wiki.language = :lang', { lang: args.lang })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }

  @Query(() => [Wiki])
  async wikisByTitle(@Args() args: TitleArgs) {
    const repository = this.connection.getRepository(Wiki)

    return repository
      .createQueryBuilder('wiki')
      .where('wiki.language = :lang AND wiki.title LIKE :title', {
        lang: args.lang,
        title: `%${args.title}%`,
      })
      .limit(args.limit)
      .offset(args.offset)
      .orderBy('wiki.updated', 'DESC')
      .getMany()
  }

  @Mutation(() => IpfsHash, { name: 'pinImage' })
  async pinImage(
    @Args({ name: 'fileUpload', type: () => GraphQLUpload })
    image: FileUpload,
  ): Promise<FileUpload> {
    const { createReadStream, filename } = await image
    const destinationPath = `./uploads/${filename}`
    return new Promise((res, rej) =>
      createReadStream()
        .pipe(createWriteStream(destinationPath))
        .on('error', rej)
        .on('finish', async () => {
          const result = await this.wikiService.pinImage(destinationPath)
          await fs.unlink(destinationPath)
          res(result)
        }),
    )
  }

  @Mutation(() => IpfsHash, { name: 'pinJSON' })
  async pinJSON(
    @Args({ name: 'data', type: () => String })
    data: string,
  ): Promise<any> {
    return this.wikiService.pinJSON(data)
  }
}

export default WikiResolver
