import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'

import { Response } from 'express'
import * as fs from 'fs'
import { Hash, hashesFilePath } from '../../Indexer/Provider/graph.service'

const HashKeys = [
  'id',
  'block',
  'createdAt',
  'transactionHash',
  'userId',
  'contentId',
]

@Controller('file')
export class UploadController {
  @Post('upload-json')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    try {
      if (file.mimetype !== 'application/json') {
        return res.status(400).json({
          error: 'File format is not valid, must be a JSON file.',
        })
      }

      const jsonData = file.buffer.toString('utf-8')
      const parsedData: Hash[] = JSON.parse(jsonData)
      const fieldCheck = parsedData.every(
        e => JSON.stringify(HashKeys) === JSON.stringify(Object.keys(e)),
      )

      if (!fieldCheck) {
        return res.status(400).json({
          error: `Invalid JSON hash, must be a array of objects containing (${HashKeys})`,
        })
      }

      fs.writeFileSync(hashesFilePath, file.buffer)

      return res.json({
        message: 'JSON file upload is successful',
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      return res.status(500).json({
        error: 'Internal Server Error',
      })
    }
  }
}

export default UploadController
