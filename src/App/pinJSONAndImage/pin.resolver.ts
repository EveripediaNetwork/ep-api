import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { GraphQLUpload, FileUpload } from 'graphql-upload'
import { createWriteStream } from 'fs'
import * as fs from 'fs/promises'
import { InternalServerErrorException, Logger } from '@nestjs/common'
import IpfsHash from './model/ipfsHash'
import PinService from './pin.service'

@Resolver(() => IpfsHash)
class PinResolver {
  constructor(private readonly pinService: PinService) {}

  private errorHandler(val: any) {
    if (val.message) {
      Logger.error(val.message)
      throw new InternalServerErrorException()
    } else {
      return val
    }
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
          const result = await this.pinService.pinImage(destinationPath)
          await fs.unlink(destinationPath)
          res(this.errorHandler(result))
        }),
    )
  }

  @Mutation(() => IpfsHash, { name: 'pinJSON' })
  async pinJSON(
    @Args({ name: 'data', type: () => String })
    data: string,
  ): Promise<IpfsHash> {
    const res = await this.pinService.pinJSON(data)
    return this.errorHandler(res)
  }
}

export default PinResolver
