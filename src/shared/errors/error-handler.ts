import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './http-error';

import { logger } from '../utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
    if (err instanceof HttpError) {
        // Log user errors as warn/info, not error
        if (err.statusCode >= 500) {
            logger.error('HttpError 5xx', { error: err.message, stack: (err as Error).stack, path: req.path });
        } else {
            logger.warn('HttpError 4xx', { error: err.message, path: req.path });
        }

        return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            details: err.details,
        });
    }

    logger.error('Unexpected Error', {
        error: (err as Error).message,
        stack: (err as Error).stack,
        path: req.path,
        method: req.method
    });

    return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error occurred',
    });
}
