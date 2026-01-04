import { v2 as cloudinary } from 'cloudinary';
import { ImageOptimizationService } from './ImageOptimizationService';
import { APIError } from '../../utils/ApiError.utils';
import logger from '../../config/logger.config';
import * as fs from 'fs/promises';

/**
 * Enhanced ImageUploadService with optimization
 * 
 * This service integrates ImageOptimizationService with Cloudinary uploads
 * to provide optimized image uploads with proper folder organization
 * 
 * Requirements: 19.1, 19.5, 19.6, 19.7, 19.8
 */
export class ImageUploadService {
  private imageOptimizationService: ImageOptimizationService;

  constructor() {
    this.imageOptimizationService = new ImageOptimizationService();

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    this.validateCloudinaryConfig();
  }

  /**
   * Validate Cloudinary configuration
   */
  private validateCloudinaryConfig(): void {
    const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing Cloudinary configuration: ${missingVars.join(', ')}`);
    }
  }

  /**
   * Upload a product image with optimization
   * 
   * - Optimizes image using ImageOptimizationService
   * - Uploads to Cloudinary 'products' folder
   * - Applies quality 'auto:good' and fetch_format 'auto'
   * - Returns secure_url
   * 
   * Requirements: 19.1, 19.5, 19.6
   */
  async uploadProductImage(file: Express.Multer.File): Promise<string> {
    try {
      logger.debug('Uploading product image', { filename: file.originalname });

      // Validate file
      await this.validateFile(file);

      // Optimize image
      const optimizedBuffer = await this.imageOptimizationService.optimizeImage(file.buffer);

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'products',
            quality: 'auto:good',
            fetch_format: 'auto',
            public_id: `product_${Date.now()}_${Math.round(Math.random() * 10000)}`,
          },
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload error:', error);
              reject(new APIError(500, `Image upload failed: ${error.message}`));
            } else if (!result) {
              reject(new APIError(500, 'Image upload failed: No result returned'));
            } else {
              resolve(result);
            }
          }
        );
        uploadStream.end(optimizedBuffer);
      });

      logger.info('Product image uploaded successfully', { url: result.secure_url });
      return result.secure_url;
    } catch (error) {
      logger.error('Failed to upload product image:', error);
      // Clean up temp files if any
      await this.cleanupTempFile(file);
      throw error instanceof APIError ? error : new APIError(500, 'Image upload service error');
    }
  }

  /**
   * Upload a banner image with optimization
   * 
   * - Optimizes image using ImageOptimizationService
   * - Uploads to Cloudinary 'banners' folder
   * - Returns secure_url
   * 
   * Requirements: 19.5, 19.6
   */
  async uploadBannerImage(file: Express.Multer.File): Promise<string> {
    try {
      logger.debug('Uploading banner image', { filename: file.originalname });

      // Validate file
      await this.validateFile(file);

      // Optimize image
      const optimizedBuffer = await this.imageOptimizationService.optimizeImage(file.buffer);

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'banners',
            quality: 'auto:good',
            fetch_format: 'auto',
            public_id: `banner_${Date.now()}_${Math.round(Math.random() * 10000)}`,
          },
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload error:', error);
              reject(new APIError(500, `Image upload failed: ${error.message}`));
            } else if (!result) {
              reject(new APIError(500, 'Image upload failed: No result returned'));
            } else {
              resolve(result);
            }
          }
        );
        uploadStream.end(optimizedBuffer);
      });

      logger.info('Banner image uploaded successfully', { url: result.secure_url });
      return result.secure_url;
    } catch (error) {
      logger.error('Failed to upload banner image:', error);
      await this.cleanupTempFile(file);
      throw error instanceof APIError ? error : new APIError(500, 'Image upload service error');
    }
  }

  /**
   * Upload a category image with optimization
   * 
   * - Optimizes image using ImageOptimizationService
   * - Uploads to Cloudinary 'categories' folder
   * - Returns secure_url
   * 
   * Requirements: 19.5, 19.6
   */
  async uploadCategoryImage(file: Express.Multer.File): Promise<string> {
    try {
      logger.debug('Uploading category image', { filename: file.originalname });

      // Validate file
      await this.validateFile(file);

      // Optimize image
      const optimizedBuffer = await this.imageOptimizationService.optimizeImage(file.buffer);

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'categories',
            quality: 'auto:good',
            fetch_format: 'auto',
            public_id: `category_${Date.now()}_${Math.round(Math.random() * 10000)}`,
          },
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload error:', error);
              reject(new APIError(500, `Image upload failed: ${error.message}`));
            } else if (!result) {
              reject(new APIError(500, 'Image upload failed: No result returned'));
            } else {
              resolve(result);
            }
          }
        );
        uploadStream.end(optimizedBuffer);
      });

      logger.info('Category image uploaded successfully', { url: result.secure_url });
      return result.secure_url;
    } catch (error) {
      logger.error('Failed to upload category image:', error);
      await this.cleanupTempFile(file);
      throw error instanceof APIError ? error : new APIError(500, 'Image upload service error');
    }
  }

  /**
   * Delete an image from Cloudinary
   * 
   * @param publicId - Cloudinary public ID of the image
   * Requirements: 19.7, 19.8
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      logger.debug('Deleting image from Cloudinary', { publicId });

      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok') {
        logger.info('Image deleted successfully', { publicId });
      } else {
        logger.warn('Image deletion returned non-ok result', { publicId, result: result.result });
        throw new APIError(500, `Failed to delete image: ${result.result}`);
      }
    } catch (error) {
      logger.error('Failed to delete image:', error);
      throw error instanceof APIError ? error : new APIError(500, 'Image deletion failed');
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   * 
   * @param url - Cloudinary URL
   * @returns Public ID or null if extraction fails
   */
  extractPublicIdFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      const fileWithExtension = urlParts[urlParts.length - 1];
      const publicId = fileWithExtension.split('.')[0];

      const folderIndex = urlParts.findIndex((part) => part === 'upload');
      if (folderIndex !== -1 && folderIndex < urlParts.length - 2) {
        const folderPath = urlParts.slice(folderIndex + 2, -1).join('/');
        return folderPath ? `${folderPath}/${publicId}` : publicId;
      }

      return publicId;
    } catch (error) {
      logger.error('Error extracting public ID from URL:', error);
      return null;
    }
  }

  /**
   * Validate file size, type, and buffer
   * 
   * Requirements: 16.5
   */
  private async validateFile(file: Express.Multer.File): Promise<void> {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp']; // For Sharp metadata validation
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!file.buffer) {
      throw new APIError(400, 'Invalid file: No buffer found');
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new APIError(
        400,
        `Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`
      );
    }

    if (file.size > maxSize) {
      throw new APIError(
        400,
        `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`
      );
    }

    // Additional validation using ImageOptimizationService
    const validation = await this.imageOptimizationService.validateImage(file.buffer, maxSize, allowedFormats);
    if (!validation.valid) {
      throw new APIError(400, validation.error || 'Invalid image file');
    }
  }

  /**
   * Clean up temporary file if it exists
   */
  private async cleanupTempFile(file: Express.Multer.File): Promise<void> {
    try {
      if (file.path) {
        await fs.unlink(file.path);
        logger.debug('Temporary file cleaned up', { path: file.path });
      }
    } catch (error) {
      logger.warn('Failed to clean up temporary file:', error);
      // Don't throw - cleanup failure shouldn't break the flow
    }
  }

  /**
   * Upload multiple images with optimization
   * 
   * @param files - Array of files to upload
   * @param folder - Cloudinary folder (products, banners, categories)
   * @param maxConcurrent - Maximum concurrent uploads (default: 3)
   * @returns Array of secure URLs
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: 'products' | 'banners' | 'categories' = 'products',
    maxConcurrent: number = 3
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new APIError(400, 'No files provided for upload');
    }

    if (files.length > 10) {
      throw new APIError(400, `Too many files: ${files.length}. Maximum allowed: 10`);
    }

    const urls: string[] = [];
    const uploadedUrls: string[] = [];

    try {
      // Process files in batches to limit concurrent uploads
      for (let i = 0; i < files.length; i += maxConcurrent) {
        const batch = files.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(async (file) => {
          const uploadMethod =
            folder === 'products'
              ? this.uploadProductImage.bind(this)
              : folder === 'banners'
              ? this.uploadBannerImage.bind(this)
              : this.uploadCategoryImage.bind(this);

          const url = await uploadMethod(file);
          uploadedUrls.push(url);
          return url;
        });

        const batchResults = await Promise.all(batchPromises);
        urls.push(...batchResults);
      }

      return urls;
    } catch (error) {
      // On error, delete already uploaded images
      logger.error('Multiple image upload failed, cleaning up uploaded images:', error);
      await this.deleteUploadedImages(uploadedUrls);
      throw error;
    }
  }

  /**
   * Delete multiple uploaded images (cleanup on error)
   */
  private async deleteUploadedImages(urls: string[]): Promise<void> {
    const deletePromises = urls.map(async (url) => {
      try {
        const publicId = this.extractPublicIdFromUrl(url);
        if (publicId) {
          await this.deleteImage(publicId);
        }
      } catch (error) {
        logger.warn('Failed to delete uploaded image during cleanup:', error);
      }
    });

    await Promise.allSettled(deletePromises);
  }
}
