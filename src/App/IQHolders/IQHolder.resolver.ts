import { Args, Query, Resolver } from '@nestjs/graphql'
import IQHolder from '../../Database/Entities/iqHolder.entity'
import IQHolderRepository from './IQHolder.repository'
import IQHolderArgs from './IQHolders.dto'

@Resolver(() => IQHolder)
class IQHoldersResolver {
  constructor(private iqHoldersRepository: IQHolderRepository) {}

  @Query(() => [IQHolder], { name: 'IQHolders' })
  async IQHolders(
    @Args('args', {
      type: () => IQHolderArgs,
    }) args: IQHolderArgs,
  ): Promise<IQHolder[]> {
    const iqHolderArgs: IQHolderArgs = {
      interval: args.interval,
      start: args.start,
      end: args.end,
      limit: args.limit,
      offset: args.offset,
    }
    return this.iqHoldersRepository.getIQHoldersCount(iqHolderArgs)
  }
}

export default IQHoldersResolver
