import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import prisma from '../config/database';
import { Role } from '@prisma/client';
import { sendError } from '../utils/response.utils';

export interface AuthUserPayload {
  sessionVersion: number;
  userId: string;
  email: string;
  role: Role;
  studentId?: string;
  lecturerId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication token missing or invalid format', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET, { algorithms: ['HS256'] }) as AuthUserPayload;

    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { student: true, lecturer: true },
    });

    if (!user || !user.isActive || (user.sessionVersion ?? 0) !== decoded.sessionVersion) {
      sendError(res, 'User account is deactivated or no longer exists', 401);
      return;
    }

    req.user = {
      sessionVersion: user.sessionVersion ?? 0,
      userId: user.id,
      email: user.email,
      role: user.role,
      studentId: user.student?.id,
      lecturerId: user.lecturer?.id,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Access token has expired', 401);
      return;
    }
    sendError(res, 'Invalid authentication token', 401);
    return;
  }
};
