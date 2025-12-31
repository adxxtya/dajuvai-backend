import sharp from 'sharp';
import logger from '../../config/logger.config';

/**
 * ImageOptimizationService handles image optimization and thumbnail generation
 * 
 * This service uses Sharp library to:
 * - Resize images to web-optimized dimensions
 * - Convert to JPEG format with progressive encoding
 * - Generate thumbnails for faster loading
 * - Maintain aspect ratios
 * 
 * Requirements: 11.2, 11.3, 19.1, 19.2, 19.3, 19.4
 */
export class ImageOptimizationService {
  /**
   * Optimize an image for web use
   * 
   * - Resizes to max 1920x1920 maintaining aspect ratio
   * - Converts to JPEG with quality 80 and progressive encoding
   * - Does not enlarge small images
   * 
   * @param buffer - Input image buffer
   * @returns Optimized image buffer
   */
  async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      logger.debug('Optimizing image', { originalSize: buffer.length });

      const optimized = await sharp(buffer)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 80,
          progressive: true,
        })
        .toBuffer();

      logger.debug('Image optimized', {
        originalSize: buffer.length,
        optimizedSize: optimized.length,
        reduction: `${(((buffer.length - optimized.length) / buffer.length) * 100).toFixed(2)}%`,
      });

      return optimized;
    } catch (error) {
      logger.error('Failed to optimize image:', error);
      throw new Error(`Image optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a thumbnail from an image
   * 
   * - Resizes to 300x300 with cover fit (crops to fill dimensions)
   * - Converts to JPEG with quality 70
   * 
   * @param buffer - Input image buffer
   * @returns Thumbnail image buffer
   */
  async generateThumbnail(buffer: Buffer): Promise<Buffer> {
    try {
      logger.debug('Generating thumbnail', { originalSize: buffer.length });

      const thumbnail = await sharp(buffer)
        .resize(300, 300, {
          fit: 'cover',
        })
        .jpeg({
          quality: 70,
        })
        .toBuffer();

      logger.debug('Thumbnail generated', {
        originalSize: buffer.length,
        thumbnailSize: thumbnail.length,
      });

      return thumbnail;
    } catch (error) {
      logger.error('Failed to generate thumbnail:', error);
      throw new Error(`Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get image metadata without loading the full image
   * 
   * @param buffer - Input image buffer
   * @returns Image metadata (width, height, format, size)
   */
  async getImageMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    try {
      const metadata = await sharp(buffer).metadata();
      return metadata;
    } catch (error) {
      logger.error('Failed to get image metadata:', error);
      throw new Error(`Failed to read image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate image format and size
   * 
   * @param buffer - Input image buffer
   * @param maxSizeBytes - Maximum allowed file size in bytes (default: 5MB)
   * @param allowedFormats - Allowed image formats (default: jpeg, png, webp)
   * @returns Validation result
   */
  async validateImage(
    buffer: Buffer,
    maxSizeBytes: number = 5 * 1024 * 1024,
    allowedFormats: string[] = ['jpeg', 'jpg', 'png', 'webp']
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check file size
      if (buffer.length > maxSizeBytes) {
        return {
          valid: false,
          error: `Image size ${(buffer.length / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB`,
        };
      }

      // Check format
      const metadata = await this.getImageMetadata(buffer);
      if (!metadata.format || !allowedFormats.includes(metadata.format)) {
        return {
          valid: false,
          error: `Image format ${metadata.format} not allowed. Allowed formats: ${allowedFormats.join(', ')}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid image file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Process multiple images in batch
   * 
   * @param buffers - Array of image buffers
   * @param optimize - Whether to optimize images (default: true)
   * @param generateThumbnails - Whether to generate thumbnails (default: false)
   * @returns Array of processed image buffers
   */
  async processBatch(
    buffers: Buffer[],
    optimize: boolean = true,
    generateThumbnails: boolean = false
  ): Promise<{ optimized?: Buffer; thumbnail?: Buffer }[]> {
    const results = await Promise.all(
      buffers.map(async (buffer) => {
        const result: { optimized?: Buffer; thumbnail?: Buffer } = {};

        if (optimize) {
          result.optimized = await this.optimizeImage(buffer);
        }

        if (generateThumbnails) {
          result.thumbnail = await this.generateThumbnail(buffer);
        }

        return result;
      })
    );

    return results;
  }
}
