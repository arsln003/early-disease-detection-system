import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary.
   * Used by the controller to upload the raw CT scan input image.
   *
   * @param buffer     - File buffer from Multer
   * @param publicId   - Cloudinary public_id (filename without extension)
   * @param folder     - Cloudinary folder (default: 'stroke_inputs')
   * @returns          - Cloudinary secure_url
   */
  async uploadImage(
  buffer: Buffer,
  publicId: string,
  folder = 'stroke_inputs',
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          public_id: publicId,
          folder,
          overwrite: true,
          resource_type: 'image',
        },
        (error, result: UploadApiResponse) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                `Cloudinary upload failed: ${error.message}`,
              ),
            );
          }
          resolve(result.secure_url);
        },
      )
      .end(buffer); // ✅ streamifier ki zaroorat nahi — .end(buffer) directly
  });
}
}