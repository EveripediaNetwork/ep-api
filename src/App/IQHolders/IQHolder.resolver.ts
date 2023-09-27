import { Args, Query, Resolver } from '@nestjs/graphql'
import IQHolder from '../../Database/Entities/iqHolder.entity'
import IQHolderRepository from './IQHolder.repository'
import IQHolderArgs from './IQHolders.dto'

@Resolver(() => IQHolder)
class IQHoldersResolver {
  constructor(private iqHoldersRepository: IQHolderRepository) {}

  @Query(() => [IQHolder], { name: 'IQHolders' })
  async IQHolders(@Args() args: IQHolderArgs) {
    return this.iqHoldersRepository.getIQHoldersCount(args)
  }
}

export default IQHoldersResolver
