import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendError, sendSuccess } from '../utils/response.utils';
import { AttendanceStatus } from '@prisma/client';

export class ReportController {
  /**
   * Get Module Attendance Analytics & Summary
   */
  public static async getModuleReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;

      const moduleItem = await prisma.module.findUnique({
        where: { id: moduleId },
        include: {
          department: true,
          lecturer: { include: { user: true } },
          enrollments: {
            include: {
              student: { include: { user: true } },
            },
          },
          attendanceSessions: {
            where: { status: { not: 'ACTIVE' } },
            include: {
              attendanceRecords: true,
            },
            orderBy: { sessionDate: 'desc' },
          },
        },
      });

      if (!moduleItem) {
        sendError(res, 'Module not found', 404);
        return;
      }

      if (req.user?.role !== 'ADMIN' && moduleItem.lecturerId !== req.user?.lecturerId) {
        sendError(res, 'Forbidden: Module not assigned to you', 403); return;
      }
      // Calculate student-level attendance percentage
      const totalSessions = moduleItem.attendanceSessions.length;
      const studentStats = moduleItem.enrollments.map((enr) => {
        const studentId = enr.studentId;
        const totalSessions = moduleItem.attendanceSessions.filter(s => s.startTime >= enr.enrolledAt).length;
        const records = moduleItem.attendanceSessions.flatMap((s) =>
          s.attendanceRecords.filter((r) => r.studentId === studentId)
        );

        const present = records.filter((r) => r.attendanceStatus === AttendanceStatus.PRESENT).length;
        const late = records.filter((r) => r.attendanceStatus === AttendanceStatus.LATE).length;
        const absent = records.filter((r) => r.attendanceStatus === AttendanceStatus.ABSENT).length;
        const excused = records.filter((r) => r.attendanceStatus === AttendanceStatus.EXCUSED).length;
        const percentage = totalSessions > 0 ? Math.round(((present + late) / totalSessions) * 100) : 100;

        return {
          studentId: enr.student.id,
          studentNumber: enr.student.studentNumber,
          studentName: enr.student.user.name,
          programme: enr.student.programme,
          totalSessions,
          present,
          late,
          absent,
          excused,
          percentage,
        };
      });

      // Session-level stats
      const sessionStats = moduleItem.attendanceSessions.map((s) => {
        const total = s.attendanceRecords.length;
        const present = s.attendanceRecords.filter((r) => r.attendanceStatus === AttendanceStatus.PRESENT).length;
        const late = s.attendanceRecords.filter((r) => r.attendanceStatus === AttendanceStatus.LATE).length;
        const absent = s.attendanceRecords.filter((r) => r.attendanceStatus === AttendanceStatus.ABSENT).length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return {
          sessionId: s.id,
          sessionCode: s.sessionCode,
          date: s.sessionDate,
          status: s.status,
          total,
          present,
          late,
          absent,
          rate,
        };
      });

      sendSuccess(res, {
        module: {
          id: moduleItem.id,
          moduleCode: moduleItem.moduleCode,
          moduleName: moduleItem.moduleName,
          department: moduleItem.department.name,
          lecturerName: moduleItem.lecturer.user.name,
          totalEnrolled: moduleItem.enrollments.length,
          totalSessions,
        },
        sessionStats,
        studentStats,
      });
    } catch (err: any) {
      console.error('Module report error:', err);
      sendError(res, 'Failed to generate module report', 500);
    }
  }

  /**
   * Export Module Attendance Records as CSV
   */
  public static async exportModuleCSV(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;

      const moduleItem = await prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!moduleItem) {
        sendError(res, 'Module not found', 404);
        return;
      }

      if (req.user?.role !== 'ADMIN' && moduleItem.lecturerId !== req.user?.lecturerId) {
        sendError(res, 'Forbidden: Module not assigned to you', 403); return;
      }
      const records = await prisma.attendanceRecord.findMany({
        where: {
          session: { moduleId },
        },
        include: {
          student: { include: { user: true } },
          session: true,
        },
        orderBy: [{ session: { sessionDate: 'desc' } }, { student: { studentNumber: 'asc' } }],
      });

      // Build CSV String
      const headers = [
        'Session Code',
        'Date',
        'Student ID',
        'Student Name',
        'Status',
        'Scanned At',
        'Verification Method',
      ];

      const cell = (value: string) => '"' + (/^[\s]*[=+@\-\t\r]/.test(value) ? "'" : '') + value.replace(/"/g, '""') + '"';
      const rows = records.map((r) => [
        cell(r.session.sessionCode),
        cell(r.session.sessionDate.toISOString().slice(0, 10)),
        cell(r.student.studentNumber),
        cell(r.student.user.name),
        cell(r.attendanceStatus),
        cell(r.scannedAt ? r.scannedAt.toISOString() : 'N/A'),
        cell(r.verificationMethod),
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=attendance_${moduleItem.moduleCode.replace(/[^a-z0-9_-]/gi, '_')}_${Date.now()}.csv`
      );

      res.status(200).send(csvContent);
    } catch (err: any) {
      sendError(res, 'Failed to export CSV report', 500);
    }
  }
}
