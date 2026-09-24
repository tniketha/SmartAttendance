import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';
import { sendError } from '../utils/response.utils';

export const requireRoles = (roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized access', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, `Forbidden: Requires one of [${roles.join(', ')}] permissions`, 403);
      return;
    }

    next();
  };
};
