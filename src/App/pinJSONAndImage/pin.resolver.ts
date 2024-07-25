/* eslint-disable no-console */
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { GraphQLUpload, FileUpload } from 'graphql-upload'
import { createWriteStream } from 'fs'
import * as fs from 'fs/promises'
import { HttpException, HttpStatus, Logger, UseGuards } from '@nestjs/common'

import sharp from 'sharp'

import IpfsHash from './model/ipfsHash'
import PinService from './pin.service'
import IsActiveGuard from '../utils/isActive.guard'

@Resolver(() => IpfsHash)
class PinResolver {
  constructor(private readonly pinService: PinService) {}

  private errorHandler(val: any) {
    if (val.message) {
      console.error('PIN JSON/IMAGE ERROR', val.message)
      return null
    }
    return val
  }

  private async optimizeFile(filePath: string, filename: string) {
    sharp.cache(false)
    await sharp(filePath, { animated: true })
      .webp({
        effort: 4,
        force: true,
        quality: 95,
      })

      .toFile(`./uploads/preview/${filename}`)

    return true
  }

  private async checkFile(image: FileUpload) {
    const type = image.mimetype.split('/')[0]
    if (type !== 'image') {
      Logger.error('Wrong file type')
      throw new HttpException(
        'Unsupported file type! Make sure file is an image.',
        HttpStatus.BAD_REQUEST,
      )
    }
    return image
  }

  @Mutation(() => IpfsHash, { name: 'pinImage' })
  async pinImage(
    @Args({ name: 'fileUpload', type: () => GraphQLUpload })
    image: FileUpload,
  ): Promise<FileUpload> {
    const { createReadStream, filename } = await this.checkFile(image)
    const destinationPath = `./uploads/${filename}`
    const newFilename = `${filename.split('.')[0]}.webp`
    const uploadPath = `./uploads/preview/${newFilename}`
    return new Promise((res, rej) => {
      const read = createReadStream()

      read.on('error', async (err) => {
        await fs.unlink(destinationPath)
        rej(err)
      })
      read.pipe(createWriteStream(destinationPath)).on('finish', async () => {
        const optimizedFile = await this.optimizeFile(
          destinationPath,
          newFilename,
        )
        if (optimizedFile) {
          const result = await this.pinService.pinImage(uploadPath)
          if (result) {
            await fs.unlink(destinationPath)
            await fs.unlink(uploadPath)
          }
          res(this.errorHandler(result))
        }
      })
    })
  }

  @Mutation(() => IpfsHash, { name: 'pinJSON' })
  @UseGuards(IsActiveGuard)
  async pinJSON(
    @Args({ name: 'data', type: () => String })
    data: string,
  ): Promise<IpfsHash> {
    const res = await this.pinService.pinJSON(data)
    return this.errorHandler(res)
  }
}

export default PinResolver
