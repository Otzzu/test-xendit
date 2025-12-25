import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './http-error';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof HttpError) {
        return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            details: err.details,
        });
    }

    console.error(err);
    return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error occurred',
    });
}
