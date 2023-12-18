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

export const hashesFilePath = './uploads/hashes.json' 
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
