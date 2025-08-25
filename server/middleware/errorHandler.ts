import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

// Comprehensive error handling middleware
export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const requestId = (req as any).requestId || 'unknown';
  
  // Log error details for debugging
  console.error(`API Error [${requestId}]:`, {
    error: err.message,
    code: err.code,
    stack: err.stack,
    method: req.method,
    url: req.url,
    timestamp,
    userId: req.user?.id,
    statusCode: err.statusCode
  });
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Create error response
  const errorResponse = {
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    timestamp,
    requestId
  };
  
  // Add details for development
  if (process.env.NODE_ENV === 'development') {
    errorResponse['details'] = err.details;
    errorResponse['stack'] = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
};

// Async route wrapper for proper error handling
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create API error with status code
export const createApiError = (message: string, statusCode: number = 500, code?: string, details?: any): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};