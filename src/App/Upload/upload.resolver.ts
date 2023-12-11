import { Resolver, Mutation, Args } from '@nestjs/graphql'
import { GraphQLUpload } from 'graphql-upload'
import UploadService from './upload.service'

@Resolver()
export default class UploadResolver {
  constructor(private readonly uploadService: UploadService) {}

  @Mutation(() => String)
  async uploadFile(
    @Args({ name: 'file', type: () => GraphQLUpload }) file: any,
  ): Promise<string> {
    const result = await this.uploadService.processFile(file)

    return result
  }
}
