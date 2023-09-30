import { Args, Query, Resolver } from '@nestjs/graphql'
import IQHolder from '../../Database/Entities/iqHolder.entity'
import IQHolderArgs from './IQHolders.dto'
import IQHolderRepository from './IQHolder.repository'

@Resolver(() => IQHolder)
class IQHoldersResolver {
  constructor(private iqHoldersRepository: IQHolderRepository) {}

  @Query(() => [IQHolder], { name: 'IQHolders' })
  async IQHolders(@Args() args: IQHolderArgs) {
    return this.iqHoldersRepository.getIQHoldersCount(args)
  }
}

export default IQHoldersResolver
