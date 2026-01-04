import multer, { memoryStorage } from 'multer';

export const multerOptions = {
    storage: memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
};

// Accept any files without fileFilter - validation done in controller
export const uploadMiddleware = multer(multerOptions).any();

export interface MulterFile {
    fieldname: string;
    originalname: string;
    mimetype: string;
    buffer: Buffer;
}
