import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class OcrService {

  async processFile(file: Express.Multer.File) {
    try {

      const formData = new FormData();

      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await axios.post(
        'http://localhost:8000/ocr',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        },
      );

      return response.data;

    } catch (error: any) {
      console.error(error);
      throw new InternalServerErrorException('OCR processing failed');
    }
  }
}