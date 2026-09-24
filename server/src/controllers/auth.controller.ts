import { createHash, randomUUID } from 'crypto';
import { disconnectUser } from '../services/socket.service';
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { ENV } from '../config/env';
import { sendError, sendSuccess } from '../utils/response.utils';
import { AuthenticatedRequest, AuthUserPayload } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { transaction } from '../services/session.service';

const dummyPasswordHash = bcrypt.hashSync(randomUUID(), 12);

export class AuthController {
  public static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await prisma.user.updateMany({ where: { id: req.user!.userId, sessionVersion: req.user!.sessionVersion }, data: { refreshTokenHash: null, sessionVersion: { increment: 1 } } });
      disconnectUser(req.user!.userId);
      sendSuccess(res, null, 'Signed out');
    } catch { sendError(res, 'Unable to sign out', 500); }
  }
  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 12 || Buffer.byteLength(newPassword) > 72 || Buffer.byteLength(currentPassword) > 72 || newPassword === currentPassword) {
        sendError(res, 'Use a new password of at least 12 characters (maximum 72 bytes)', 400); return;
      }
      const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
      if (!await bcrypt.compare(currentPassword, user.passwordHash)) { sendError(res, 'Current password is incorrect', 400); return; }
      const result = await prisma.user.updateMany({ where: { id: user.id, passwordHash: user.passwordHash, sessionVersion: req.user!.sessionVersion }, data: { passwordHash: await bcrypt.hash(newPassword, 12), refreshTokenHash: null, sessionVersion: { increment: 1 } } });
      if (!result.count) { sendError(res, 'Account changed. Sign in again.', 409); return; }
      disconnectUser(user.id);
      sendSuccess(res, null, 'Password changed. Sign in again.');
    } catch { sendError(res, 'Unable to change password', 500); }
  }

  /**
   * Login with Email or Student Number and Password
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password } = req.body;

      if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password || identifier.length > 254 || Buffer.byteLength(password) > 72) {
        sendError(res, 'Email/Student ID and password are required', 400);
        return;
      }

      // Search user by email or by studentNumber
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier.trim().toLowerCase() },
            { student: { studentNumber: identifier.trim().toUpperCase() } },
            { lecturer: { employeeNumber: identifier.trim().toUpperCase() } },
          ],
        },
        include: {
          student: {
            include: { department: true },
          },
          lecturer: {
            include: { department: true },
          },
        },
      });

      const isPasswordValid = await bcrypt.compare(password, user?.passwordHash || dummyPasswordHash);
      if (!user || !user.isActive || !isPasswordValid) {
        sendError(res, 'Invalid credentials', 401); return;
      }

      const signedIn = await transaction(async tx => {
        const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
        if (!current.isActive || current.passwordHash !== user.passwordHash) throw new Error('Account changed during sign-in');
        return tx.user.update({ where: { id: user.id }, data: { sessionVersion: (current.sessionVersion ?? 0) + 1, refreshTokenHash: null } });
      });
      disconnectUser(user.id);
      const tokenPayload: AuthUserPayload = {
        sessionVersion: signedIn.sessionVersion,
        userId: user.id,
        email: user.email,
        role: user.role,
        studentId: user.student?.id,
        lecturerId: user.lecturer?.id,
      };

      const accessToken = jwt.sign(tokenPayload, ENV.JWT_SECRET, {
        expiresIn: ENV.JWT_EXPIRES_IN as any,
      });

      const refreshToken = jwt.sign(tokenPayload, ENV.JWT_REFRESH_SECRET, {
        expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any, jwtid: randomUUID(),
      });

      await prisma.user.updateMany({ where: { id: user.id, sessionVersion: signedIn.sessionVersion }, data: { refreshTokenHash: hashToken(refreshToken) } });
      sendSuccess(res, {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          student: user.student
            ? {
                id: user.student.id,
                studentNumber: user.student.studentNumber,
                programme: user.student.programme,
                academicYear: user.student.academicYear,
                batch: user.student.batch,
                department: user.student.department.name,
              }
            : null,
          lecturer: user.lecturer
            ? {
                id: user.lecturer.id,
                employeeNumber: user.lecturer.employeeNumber,
                title: user.lecturer.title,
                department: user.lecturer.department.name,
              }
            : null,
        },
      }, 'Login successful');
    } catch (err: any) {
      console.error('Login error:', err);
      sendError(res, 'An error occurred during login', 500);
    }
  }

  /**
   * Refresh Access Token using Refresh Token
   */
  public static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (typeof refreshToken !== 'string' || refreshToken.length > 4096) {
        sendError(res, 'Refresh token is required', 400);
        return;
      }

      const decoded = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as AuthUserPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { student: true, lecturer: true },
      });

      if (!user || !user.isActive || (user.sessionVersion ?? 0) !== decoded.sessionVersion || user.refreshTokenHash !== hashToken(refreshToken)) {
        sendError(res, 'User no longer active', 401);
        return;
      }

      const newPayload: AuthUserPayload = {
        sessionVersion: user.sessionVersion,
        userId: user.id,
        email: user.email,
        role: user.role,
        studentId: user.student?.id,
        lecturerId: user.lecturer?.id,
      };

      const accessToken = jwt.sign(newPayload, ENV.JWT_SECRET, {
        expiresIn: ENV.JWT_EXPIRES_IN as any,
      });

      const rotated = jwt.sign(newPayload, ENV.JWT_REFRESH_SECRET, { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any, jwtid: randomUUID() });
      const consumed = await prisma.user.updateMany({ where: { id: user.id, refreshTokenHash: hashToken(refreshToken), sessionVersion: decoded.sessionVersion }, data: { refreshTokenHash: hashToken(rotated) } });
      if (consumed.count !== 1) { sendError(res, 'Refresh token already used', 401); return; }
      sendSuccess(res, { accessToken, refreshToken: rotated }, 'Access token refreshed successfully');
    } catch (err) {
      sendError(res, 'Invalid or expired refresh token', 401);
    }
  }

  /**
   * Get Current Authenticated Profile
   */
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized', 401);
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          student: {
            include: {
              department: true,
              enrollments: {
                include: {
                  module: true,
                },
              },
            },
          },
          lecturer: {
            include: {
              department: true,
              modules: true,
            },
          },
        },
      });

      if (!user) {
        sendError(res, 'User not found', 404);
        return;
      }

      sendSuccess(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        student: user.student,
        lecturer: user.lecturer,
      });
    } catch (err: any) {
      sendError(res, 'Failed to fetch user profile', 500);
    }
  }
}
