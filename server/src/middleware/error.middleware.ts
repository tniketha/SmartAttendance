import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.utils';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Unhandled Server Error:', err);

  const statusCode = err.status === 400 ? 400 : err.status === 413 ? 413 : 500;
  const message = statusCode === 400 ? 'Invalid request body' : statusCode === 413 ? 'Request too large' : 'Internal server error occurred';

  sendError(res, message, statusCode);
};
