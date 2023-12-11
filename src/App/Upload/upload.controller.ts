import { Controller, Post, UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
// import { Multer } from 'multer';
import { Response } from 'express';

@Controller('file')
export class UploadController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    console.log(file);
    
    res.json({ message: 'File uploaded successfully' });
  }
}

export default UploadController;
