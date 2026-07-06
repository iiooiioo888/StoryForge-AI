/**
 * Winston Logger - 結構化日誌系統
 */
const winston = require('winston');
const morgan = require('morgan');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                    return `${timestamp} [${level}] ${message}${metaStr}`;
                })
            ),
        }),
    ],
});

// Morgan HTTP 日誌
const httpLogger = morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.url.includes('/assets/') || req.url.includes('.css') || req.url.includes('.js'),
});

// 請求日誌中間件
function requestLogger(req, res, next) {
    req.startTime = Date.now();
    req.requestId = Math.random().toString(36).substring(2, 10);
    
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        if (duration > 1000) {
            logger.warn('Slow request', {
                method: req.method,
                url: req.originalUrl,
                duration: `${duration}ms`,
                status: res.statusCode,
            });
        }
    });
    
    next();
}

module.exports = { logger, httpLogger, requestLogger };
