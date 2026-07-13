import { AppError } from '../../shared/errors/AppError.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
  } else if (
    err.message?.includes('Strategy validation failed') ||
    err.message?.includes('Backtest period') ||
    err.message?.includes('Insufficient data') ||
    err.message?.includes('stock')
  ) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  }

  // Log server/internal errors
  if (statusCode === 500) {
    console.error(err.stack || err);
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
    code,
    details,
  });
}

