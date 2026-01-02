import winston from 'winston';
import { join } from 'path';

/**
 * Custom log levels
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Log level colors for console output
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

/**
 * Determine log level based on environment
 */
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

/**
 * Custom format for console output (development)
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = '\n' + JSON.stringify(meta, null, 2);
    }
    
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

/**
 * JSON format for file output (production)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Console transport for development
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

/**
 * File transport for error logs
 */
let errorFileTransport: winston.transports.FileTransportInstance | null = null;
try {
  errorFileTransport = new winston.transports.File({
    filename: join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    tailable: true,
  });
} catch (error) {
  console.warn('Warning: Could not create error log file transport:', error);
}

/**
 * File transport for combined logs
 */
let combinedFileTransport: winston.transports.FileTransportInstance | null = null;
try {
  combinedFileTransport = new winston.transports.File({
    filename: join(__dirname, '../../logs/combined.log'),
    format: fileFormat,
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    tailable: true,
  });
} catch (error) {
  console.warn('Warning: Could not create combined log file transport:', error);
}

/**
 * Create logs directory if it doesn't exist
 */
import { mkdirSync } from 'fs';
const logsDir = join(__dirname, '../../logs');
try {
  mkdirSync(logsDir, { recursive: true });
} catch (error) {
  // Directory already exists or cannot be created
  // Log to console since logger isn't ready yet
  console.warn('Warning: Could not create logs directory:', error);
}

/**
 * Winston logger instance
 */
const transports: winston.transport[] = [consoleTransport];

// Only add file transports if not explicitly disabled
if (process.env.DISABLE_FILE_LOGGING !== 'true') {
  if (errorFileTransport) transports.push(errorFileTransport);
  if (combinedFileTransport) transports.push(combinedFileTransport);
} else {
  console.log('File logging disabled via DISABLE_FILE_LOGGING env var');
}

const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Handle uncaught exceptions
 */
if (process.env.DISABLE_FILE_LOGGING !== 'true') {
  try {
    logger.exceptions.handle(
      new winston.transports.File({
        filename: join(__dirname, '../../logs/exceptions.log'),
        format: fileFormat,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
      })
    );
  } catch (error) {
    console.warn('Warning: Could not create exceptions log file transport:', error);
  }
}

/**
 * Handle unhandled promise rejections
 */
if (process.env.DISABLE_FILE_LOGGING !== 'true') {
  try {
    logger.rejections.handle(
      new winston.transports.File({
        filename: join(__dirname, '../../logs/rejections.log'),
        format: fileFormat,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
      })
    );
  } catch (error) {
    console.warn('Warning: Could not create rejections log file transport:', error);
  }
}

/**
 * Stream for Morgan HTTP logger integration
 */
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Helper functions for structured logging
 */
export const logError = (message: string, error?: Error | unknown, meta?: object) => {
  if (error instanceof Error) {
    logger.error(message, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...meta,
    });
  } else {
    logger.error(message, { error, ...meta });
  }
};

export const logWarn = (message: string, meta?: object) => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: object) => {
  logger.info(message, meta);
};

export const logHttp = (message: string, meta?: object) => {
  logger.http(message, meta);
};

export const logDebug = (message: string, meta?: object) => {
  logger.debug(message, meta);
};

export default logger;
