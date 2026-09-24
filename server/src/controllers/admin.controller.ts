import { disconnectUser } from '../services/socket.service';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendError, sendSuccess } from '../utils/response.utils';
import { AttendanceStatus } from '@prisma/client';

export class AdminController {
  /**
   * System Overview & Platform Statistics
   */
  public static async getSystemStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [
        totalStudents,
        totalLecturers,
        totalModules,
        totalSessions,
        totalRecords,
        presentRecords,
        recentAudits,
      ] = await Promise.all([
        prisma.student.count(),
        prisma.lecturer.count(),
        prisma.module.count(),
        prisma.attendanceSession.count(),
        prisma.attendanceRecord.count(),
        prisma.attendanceRecord.count({
          where: {
            attendanceStatus: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
          },
        }),
        prisma.attendanceAuditLog.findMany({
          take: 10,
          orderBy: { changedAt: 'desc' },
          include: {
            changedBy: { select: { name: true, email: true, role: true } },
            attendanceRecord: {
              include: {
                student: { include: { user: true } },
                session: { include: { module: true } },
              },
            },
          },
        }),
      ]);

      const overallAttendanceRate =
        totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

      sendSuccess(res, {
        totalStudents,
        totalLecturers,
        totalModules,
        totalSessions,
        overallAttendanceRate,
        recentAudits: recentAudits.map((a) => ({
          id: a.id,
          studentName: a.attendanceRecord.student.user.name,
          studentNumber: a.attendanceRecord.student.studentNumber,
          moduleCode: a.attendanceRecord.session.module.moduleCode,
          oldStatus: a.oldStatus,
          newStatus: a.newStatus,
          reason: a.reason,
          changedBy: a.changedBy.name,
          changedAt: a.changedAt,
        })),
      });
    } catch (err: any) {
      console.error('Admin stats error:', err);
      sendError(res, 'Failed to fetch admin stats', 500);
    }
  }

  /**
   * Get User Accounts
   */
  public static async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        include: {
          student: { include: { department: true } },
          lecturer: { include: { department: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      sendSuccess(
        res,
        users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
          identifier: u.student?.studentNumber || u.lecturer?.employeeNumber || 'ADMIN',
          department: u.student?.department.name || u.lecturer?.department.name || 'Administration',
        }))
      );
    } catch (err: any) {
      sendError(res, 'Failed to fetch users', 500);
    }
  }

  /**
   * Toggle User Active Status (Enable/Disable)
   */
  public static async toggleUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        sendError(res, 'User not found', 404);
        return;
      }

      if (user.role === 'ADMIN') { sendError(res, 'Administrator accounts require a separate account recovery process', 403); return; }
      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive, sessionVersion: { increment: 1 }, refreshTokenHash: null },
      });

      disconnectUser(id);
      sendSuccess(
        res,
        { id: updated.id, isActive: updated.isActive },
        `User ${updated.isActive ? 'activated' : 'deactivated'} successfully`
      );
    } catch (err: any) {
      sendError(res, 'Failed to update user status', 500);
    }
  }

  /**
   * Get All Attendance Audit Logs
   */
  public static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const audits = await prisma.attendanceAuditLog.findMany({
        orderBy: { changedAt: 'desc' },
        include: {
          changedBy: { select: { name: true, email: true, role: true } },
          attendanceRecord: {
            include: {
              student: { include: { user: true } },
              session: { include: { module: true } },
            },
          },
        },
      });

      sendSuccess(
        res,
        audits.map((a) => ({
          id: a.id,
          studentName: a.attendanceRecord.student.user.name,
          studentNumber: a.attendanceRecord.student.studentNumber,
          moduleCode: a.attendanceRecord.session.module.moduleCode,
          oldStatus: a.oldStatus,
          newStatus: a.newStatus,
          reason: a.reason,
          changedBy: a.changedBy.name,
          changedByEmail: a.changedBy.email,
          changedAt: a.changedAt,
        }))
      );
    } catch (err: any) {
      sendError(res, 'Failed to fetch audit logs', 500);
    }
  }
}
