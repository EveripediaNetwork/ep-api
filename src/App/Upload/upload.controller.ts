import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import DatabaseService from './upload.service'

@Controller('file')
export class UploadController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Post('upload-json')
  @UseInterceptors(FileInterceptor('file', { dest: './uploads' }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    try {
      if (file.mimetype !== 'application/json') {
        return res.status(400).json({
          error: 'Invalid format, must be a JSON file.',
        })
      }

      const jsonData: any = JSON.parse(file.buffer.toString())
      await this.databaseService.saveJsonData(jsonData)
      return res.json({
        message: 'JSON file uploaded successfully',
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
