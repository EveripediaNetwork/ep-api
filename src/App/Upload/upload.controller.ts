import { Controller, Post, UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('file')
export class UploadController {
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
        });
      }

      const filePath = `./uploads/${file.originalname}`;
      fs.writeFileSync(filePath, file.buffer);

      return res.json({
        message: 'JSON file uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
      });
    }
  }
}

export default UploadController;
