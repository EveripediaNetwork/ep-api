import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import path from 'path';

@Injectable()
export default class UploadService {
  async processFile(file: Express.Multer.File): Promise<string> {
    try {
      const uploadDirectory = path.join(__dirname, 'Upload');
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory);
      }
      const filename = `${Date.now()}_${file.originalname}`;

      const filePath = path.join(uploadDirectory, filename);
      fs.writeFileSync(filePath, file.buffer);

      return 'File has been saved successfully';
    } catch (error) {
      console.error('Error:', error);
      throw new Error('Failed to save the file');
    }
  }
}