import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { GraphQLUpload, FileUpload } from 'graphql-upload'
import { createWriteStream } from 'fs'
import * as fs from 'fs/promises'
import IpfsHash from './model/ipfsHash'
import PinService from './pin.service'

@Resolver(() => IpfsHash)
class PinResolver {
  constructor(private readonly pinService: PinService) {}

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
          const result = await this.pinService.pinImage(destinationPath)
          await fs.unlink(destinationPath)
          res(result)
        }),
    )
  }

  @Mutation(() => IpfsHash, { name: 'pinJSON' })
  async pinJSON(
    @Args({ name: 'data', type: () => String })
    data: string,
  ): Promise<IpfsHash> { 
    return this.pinService.pinJSON(data)
  }
}

export default PinResolver
