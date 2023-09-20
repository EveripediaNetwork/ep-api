import { Args, Query, Resolver } from '@nestjs/graphql';
import IQHolder from '../../Database/Entities/iqHolder.entity';
import IQHolderRepository from './IQHolder.repository';
import IQHolderArgs from './IQHolders.dto';
import IQHolderService from "./IQHolder.service";

@Resolver(() => IQHolder)
class IQHoldersResolver {
  constructor(private iqHolderService: IQHolderService) {}

  @Query(() => [IQHolder], { name: 'IQHolders' })
  async IQHolders(
    @Args('args', {
      type: () => IQHolderArgs,
    }) args: IQHolderArgs,
  ): Promise<IQHolder[]> {
    return this.iqHolderService.getIQHoldersWithArgs(args);
  }
}

export default IQHoldersResolver;