import { Request, Response } from "express";
import { APIError } from "../utils/ApiError.utils";
import { ImageService } from '../service/image.service';
import logger from '../config/logger.config';

export class ImageController {
    private imageService: ImageService
    constructor() {
        this.imageService = new ImageService()
    }
    async uplaodSingle(req: Request<{}, {}, {}, { folder: string }>, res: Response) {
        try {
            const files = req.files as Express.Multer.File[];
            logger.debug('Image upload request received', { 
                fileCount: files?.length || 0,
                folder: req.query.folder 
            });

            if (!files || files.length === 0) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const file = files[0];
            const folder = req.query.folder;

            const upload = await this.imageService.uploadSingleImage(file, folder);
            logger.info('Image uploaded successfully', { folder, url: upload });
            res.json({ success: true, data: upload });
        } catch (error) {
            if (error instanceof APIError) {
                logger.error('Image upload API error', { error: error.message, status: error.status });
                res.status(error.status).json({
                    success: false,
                    msg: error.message
                })
            } else {
                logger.error('Image upload error', { error });
                res.status(500).json({
                    success: false,
                    msg: "Error uploding image"
                })
            }
        }
    }
}