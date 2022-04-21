import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'
import { GraphQLUpload, FileUpload } from 'graphql-upload'
import { createWriteStream } from 'fs'
import * as fs from 'fs/promises'
import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
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

  private async checkFile(image: FileUpload, context: any) {
    const type = image.mimetype.split('/')[0]
    if (type !== 'image') {
      Logger.error('Wrong file type')
      throw new HttpException(
        'Unsupported file type! Make sure file is an image.',
        HttpStatus.BAD_REQUEST,
      )
    }
    if (context.req.headers['content-length'] > 10000000) {
      Logger.error('File too large')
      throw new HttpException(
        'Too large! Make sure file is less than 10mb.',
        HttpStatus.BAD_REQUEST,
      )
    }
    return image
  }

  @Mutation(() => IpfsHash, { name: 'pinImage' })
  async pinImage(
    @Args({ name: 'fileUpload', type: () => GraphQLUpload })
    image: FileUpload,
    @Context() context: any,
  ): Promise<FileUpload> {
    const { createReadStream, filename } = await this.checkFile(image, context)
    const destinationPath = `./uploads/${filename}`
    return new Promise((res, rej) =>
      createReadStream()
        .pipe(createWriteStream(destinationPath))
        .on('error', rej)
        .on('finish', async () => {
          const result = await this.pinService.pinImage(destinationPath)
          if (result) {
            await fs.unlink(destinationPath)
          }
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
