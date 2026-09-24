import { objectId } from '../middleware/validation.middleware';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendError, sendSuccess } from '../utils/response.utils';
import { AttendanceStatus, SessionStatus } from '@prisma/client';

export class StudentController {
  /**
   * Get Student Dashboard Overview (Today's classes, stats, summary)
   */
  public static async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        sendError(res, 'Student profile not linked', 400);
        return;
      }

      // Enrolled modules
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          module: {
            include: { lecturer: { include: { user: true } } },
          },
        },
      });
      const moduleIds = enrollments.map((e) => e.moduleId);

      // Total records for this student
      const records = await prisma.attendanceRecord.findMany({
        where: { studentId, session: { status: { not: 'ACTIVE' } } },
      });

      const totalClasses = records.length;
      const presentCount = records.filter((r) => r.attendanceStatus === AttendanceStatus.PRESENT).length;
      const lateCount = records.filter((r) => r.attendanceStatus === AttendanceStatus.LATE).length;
      const absentCount = records.filter((r) => r.attendanceStatus === AttendanceStatus.ABSENT).length;
      const excusedCount = records.filter((r) => r.attendanceStatus === AttendanceStatus.EXCUSED).length;

      // Calculation: (Present + Late) / Total * 100
      const overallPercentage =
        totalClasses > 0 ? Math.round(((presentCount + lateCount) / totalClasses) * 100) : 100;

      // Active or today's sessions for enrolled modules
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todaySessions = await prisma.attendanceSession.findMany({
        where: {
          moduleId: { in: moduleIds },
          sessionDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          module: true,
          attendanceRecords: {
            where: { studentId },
          },
        },
        orderBy: { startTime: 'asc' },
      });

      const formattedTodaySessions = todaySessions.map((session) => {
        const studentRecord = session.attendanceRecords[0] || null;
        return {
          id: session.id,
          sessionCode: session.sessionCode,
          moduleCode: session.module.moduleCode,
          moduleName: session.module.moduleName,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          userAttendanceStatus: studentRecord ? studentRecord.attendanceStatus : null,
          hasMarked: !!studentRecord,
        };
      });

      sendSuccess(res, {
        stats: {
          overallPercentage,
          totalClasses,
          presentCount,
          lateCount,
          absentCount,
          excusedCount,
          enrolledModulesCount: moduleIds.length,
        },
        todaySessions: formattedTodaySessions,
      });
    } catch (err: any) {
      console.error('Student dashboard error:', err);
      sendError(res, 'Failed to fetch student dashboard data', 500);
    }
  }

  /**
   * Get Enrolled Modules with Subject-Wise Attendance %
   */
  public static async getModules(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        sendError(res, 'Student profile not linked', 400);
        return;
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          module: {
            include: {
              lecturer: { include: { user: true } },
              department: true,
            },
          },
        },
      });

      const moduleStats = await Promise.all(
        enrollments.map(async (item) => {
          const mod = item.module;

          // Find records for this student and module
          const records = await prisma.attendanceRecord.findMany({
            where: {
              studentId,
              session: { moduleId: mod.id, status: { not: 'ACTIVE' } },
            },
          });

          const total = records.length;
          const present = records.filter((r) => r.attendanceStatus === AttendanceStatus.PRESENT).length;
          const late = records.filter((r) => r.attendanceStatus === AttendanceStatus.LATE).length;
          const absent = records.filter((r) => r.attendanceStatus === AttendanceStatus.ABSENT).length;
          const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

          return {
            id: mod.id,
            moduleCode: mod.moduleCode,
            moduleName: mod.moduleName,
            department: mod.department.name,
            lecturerName: mod.lecturer.user.name,
            academicYear: mod.academicYear,
            semester: mod.semester,
            stats: {
              total,
              present,
              late,
              absent,
              percentage,
            },
          };
        })
      );

      sendSuccess(res, moduleStats);
    } catch (err: any) {
      sendError(res, 'Failed to fetch enrolled modules', 500);
    }
  }

  /**
   * Get Attendance History with Filter Support
   */
  public static async getAttendanceHistory(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        sendError(res, 'Student profile not linked', 400);
        return;
      }

      const { status, moduleId } = req.query;

      if ((moduleId && !objectId.safeParse(moduleId).success) || (status && !Object.values(AttendanceStatus).includes(status as AttendanceStatus))) {
        sendError(res, 'Invalid attendance filter', 400); return;
      }
      const whereClause: any = { studentId };

      if (status && Object.values(AttendanceStatus).includes(status as AttendanceStatus)) {
        whereClause.attendanceStatus = status as AttendanceStatus;
      }

      if (moduleId) {
        whereClause.session = { moduleId: String(moduleId) };
      }

      const records = await prisma.attendanceRecord.findMany({
        where: whereClause,
        include: {
          reviewRequest: true,
          session: {
            include: {
              module: true,
              lecturer: { include: { user: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = records.map((rec) => ({
        id: rec.id,
        review: rec.reviewRequest ? { status: rec.reviewRequest.status, decisionReason: rec.reviewRequest.decisionReason } : null,
        sessionId: rec.sessionId,
        moduleCode: rec.session.module.moduleCode,
        moduleName: rec.session.module.moduleName,
        lecturerName: rec.session.lecturer.user.name,
        sessionDate: rec.session.sessionDate,
        startTime: rec.session.startTime,
        scannedAt: rec.scannedAt,
        status: rec.attendanceStatus,
        verificationMethod: rec.verificationMethod,
      }));

      sendSuccess(res, formatted);
    } catch (err: any) {
      sendError(res, 'Failed to fetch attendance history', 500);
    }
  }

  /**
   * Get Subject-Wise Detailed Attendance Statistics
   */
  public static async getStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        sendError(res, 'Student profile not linked', 400);
        return;
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: { module: true },
      });

      const subjects = await Promise.all(
        enrollments.map(async (e) => {
          const records = await prisma.attendanceRecord.findMany({
            where: {
              studentId,
              session: { moduleId: e.moduleId, status: { not: 'ACTIVE' } },
            },
          });

          const total = records.length;
          const present = records.filter((r) => r.attendanceStatus === AttendanceStatus.PRESENT).length;
          const late = records.filter((r) => r.attendanceStatus === AttendanceStatus.LATE).length;
          const absent = records.filter((r) => r.attendanceStatus === AttendanceStatus.ABSENT).length;
          const excused = records.filter((r) => r.attendanceStatus === AttendanceStatus.EXCUSED).length;
          const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

          return {
            moduleCode: e.module.moduleCode,
            moduleName: e.module.moduleName,
            total,
            present,
            late,
            absent,
            excused,
            percentage,
          };
        })
      );

      const totalAll = subjects.reduce((sum, s) => sum + s.total, 0);
      const presentAll = subjects.reduce((sum, s) => sum + s.present, 0);
      const lateAll = subjects.reduce((sum, s) => sum + s.late, 0);
      const absentAll = subjects.reduce((sum, s) => sum + s.absent, 0);
      const overallPercentage =
        totalAll > 0 ? Math.round(((presentAll + lateAll) / totalAll) * 100) : 100;

      sendSuccess(res, {
        overallPercentage,
        totalClasses: totalAll,
        totalPresent: presentAll,
        totalLate: lateAll,
        totalAbsent: absentAll,
        subjectWise: subjects,
      });
    } catch (err: any) {
      sendError(res, 'Failed to fetch statistics', 500);
    }
  }
}
