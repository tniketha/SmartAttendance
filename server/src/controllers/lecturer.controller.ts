import { randomBytes } from 'crypto';
import { finalizeSession } from '../services/session.service';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendError, sendSuccess } from '../utils/response.utils';
import { QRService } from '../services/qr.service';
import { emitToSession } from '../services/socket.service';
import { AttendanceStatus, SessionStatus } from '@prisma/client';

export class LecturerController {
  /**
   * Get Lecturer Dashboard Overview
   */
  public static async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const lecturerId = req.user?.lecturerId;
      if (!lecturerId) {
        sendError(res, 'Lecturer profile not linked', 400);
        return;
      }

      // Modules taught by lecturer
      const modules = await prisma.module.findMany({
        where: { lecturerId },
        include: {
          _count: { select: { enrollments: true } },
        },
      });

      const moduleIds = modules.map((m) => m.id);

      // Today's sessions
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todaySessions = await prisma.attendanceSession.findMany({
        where: {
          lecturerId,
          sessionDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          module: true,
          _count: { select: { attendanceRecords: true } },
        },
        orderBy: { startTime: 'desc' },
      });

      // Calculate overall average attendance across all lecturer modules
      const allRecords = await prisma.attendanceRecord.findMany({
        where: {
          session: { lecturerId, status: { not: 'ACTIVE' } },
        },
        select: { attendanceStatus: true },
      });

      const totalRecords = allRecords.length;
      const attendedCount = allRecords.filter(
        (r) => r.attendanceStatus === AttendanceStatus.PRESENT || r.attendanceStatus === AttendanceStatus.LATE
      ).length;
      const avgAttendanceRate =
        totalRecords > 0 ? Math.round((attendedCount / totalRecords) * 100) : 0;

      sendSuccess(res, {
        totalModules: modules.length,
        todaySessionsCount: todaySessions.length,
        averageAttendanceRate: avgAttendanceRate,
        modules: modules.map((m) => ({
          id: m.id,
          moduleCode: m.moduleCode,
          moduleName: m.moduleName,
          enrolledCount: m._count.enrollments,
        })),
        todaySessions: todaySessions.map((s) => ({
          id: s.id,
          sessionCode: s.sessionCode,
          moduleCode: s.module.moduleCode,
          moduleName: s.module.moduleName,
          status: s.status,
          startTime: s.startTime,
          endTime: s.endTime,
          totalScanned: s._count.attendanceRecords,
        })),
      });
    } catch (err: any) {
      console.error('Lecturer dashboard error:', err);
      sendError(res, 'Failed to fetch lecturer dashboard', 500);
    }
  }

  /**
   * Get Modules Taught by Lecturer
   */
  public static async getModules(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const lecturerId = req.user?.lecturerId;
      if (!lecturerId) {
        sendError(res, 'Lecturer profile not linked', 400);
        return;
      }

      const modules = await prisma.module.findMany({
        where: { lecturerId },
        include: {
          department: true,
          _count: { select: { enrollments: true, attendanceSessions: true } },
        },
      });

      sendSuccess(
        res,
        modules.map((m) => ({
          id: m.id,
          moduleCode: m.moduleCode,
          moduleName: m.moduleName,
          department: m.department.name,
          academicYear: m.academicYear,
          semester: m.semester,
          enrolledCount: m._count.enrollments,
          sessionCount: m._count.attendanceSessions,
        }))
      );
    } catch (err: any) {
      sendError(res, 'Failed to fetch modules', 500);
    }
  }

  /**
   * Get Enrolled Students for a Module
   */
  public static async getModuleStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;

      const owner = await prisma.module.findUnique({ where: { id: moduleId } });
      if (!owner || (req.user?.role !== 'ADMIN' && owner.lecturerId !== req.user?.lecturerId)) {
        sendError(res, 'Module not found or not assigned to you', 403); return;
      }
      const enrollments = await prisma.enrollment.findMany({
        where: { moduleId },
        include: {
          student: {
            include: { user: true },
          },
        },
        orderBy: { student: { studentNumber: 'asc' } },
      });

      const students = enrollments.map((e) => ({
        id: e.student.id,
        studentNumber: e.student.studentNumber,
        name: e.student.user.name,
        email: e.student.user.email,
        programme: e.student.programme,
        batch: e.student.batch,
        enrolledAt: e.enrolledAt,
      }));

      sendSuccess(res, students);
    } catch (err: any) {
      sendError(res, 'Failed to fetch enrolled students', 500);
    }
  }

  /**
   * Create & Start a New Attendance Session
   */
  public static async createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const lecturerId = req.user?.lecturerId;
      if (!lecturerId) {
        sendError(res, 'Lecturer profile not linked', 400);
        return;
      }

      const {
        moduleId,
        durationMinutes = 10,
        lateThresholdMinutes = 5,
        geoValidationEnabled = false,
        latitude,
        longitude,
        allowedRadius = 100,
      } = req.body;

      if (!moduleId) {
        sendError(res, 'Module ID is required', 400);
        return;
      }

      const moduleItem = await prisma.module.findFirst({
        where: { id: moduleId, lecturerId },
      });

      if (!moduleItem) {
        sendError(res, 'Module not found or not assigned to you', 403);
        return;
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const lateThresholdTime = lateThresholdMinutes
        ? new Date(now.getTime() + lateThresholdMinutes * 60 * 1000)
        : null;

      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSeq = randomBytes(8).toString('hex');
      const sessionCode = `ATT-${moduleItem.moduleCode}-${dateStr}-${randomSeq}`;

      // Create session first with placeholder token
      const session = await prisma.attendanceSession.create({
        data: {
          sessionCode,
          moduleId,
          lecturerId,
          sessionDate: now,
          startTime: now,
          endTime,
          lateThresholdTime,
          currentQrToken: 'temp',
          tokenExpiry: now,
          status: SessionStatus.ACTIVE,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          allowedRadius: allowedRadius || 100,
          geoValidationEnabled: !!geoValidationEnabled,
        },
      });

      // Generate first dynamic HMAC QR
      const { qrPayload, qrString, expiresAt } = QRService.generateSessionQR(session.id);

      // Update session with initial QR token
      const updatedSession = await prisma.attendanceSession.update({
        where: { id: session.id },
        data: {
          currentQrToken: qrString,
          tokenExpiry: expiresAt,
        },
        include: {
          module: true,
        },
      });

      // Total enrolled students
      const totalEnrolled = await prisma.enrollment.count({
        where: { moduleId },
      });

      sendSuccess(
        res,
        {
          session: {
            id: updatedSession.id,
            sessionCode: updatedSession.sessionCode,
            moduleCode: updatedSession.module.moduleCode,
            moduleName: updatedSession.module.moduleName,
            startTime: updatedSession.startTime,
            endTime: updatedSession.endTime,
            lateThresholdTime: updatedSession.lateThresholdTime,
            status: updatedSession.status,
            geoValidationEnabled: updatedSession.geoValidationEnabled,
            totalEnrolled,
          },
          qrPayload,
          qrString,
          expiresAt,
        },
        'Attendance session started successfully',
        201
      );
    } catch (err: any) {
      console.error('Create session error:', err);
      sendError(res, 'Failed to create attendance session', 500);
    }
  }

  /**
   * Refresh Dynamic Rotating QR Code
   */
  public static async refreshQR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lecturerId = req.user?.lecturerId;

      const session = await prisma.attendanceSession.findUnique({
        where: { id },
      });

      if (!session) {
        sendError(res, 'Session not found', 404);
        return;
      }

      if (session.lecturerId !== lecturerId && req.user?.role !== 'ADMIN') {
        sendError(res, 'Forbidden: You do not own this session', 403);
        return;
      }

      if (session.status !== SessionStatus.ACTIVE || session.endTime <= new Date()) {
        sendError(res, `Cannot refresh QR for ${session.status.toLowerCase()} session`, 400);
        return;
      }

      // Generate new HMAC QR
      const { qrPayload, qrString, expiresAt } = QRService.generateSessionQR(session.id);

      await prisma.attendanceSession.update({
        where: { id },
        data: {
          currentQrToken: qrString,
          tokenExpiry: expiresAt,
        },
      });

      sendSuccess(res, { qrPayload, qrString, expiresAt });
    } catch (err: any) {
      sendError(res, 'Failed to refresh QR token', 500);
    }
  }

  /**
   * Get Live Roster & Real-Time Stats for an Active Session
   */
  public static async getSessionLive(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const session = await prisma.attendanceSession.findUnique({
        where: { id },
        include: {
          module: true,
          attendanceRecords: {
            include: {
              student: { include: { user: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!session) {
        sendError(res, 'Session not found', 404);
        return;
      }

      if (req.user?.role !== 'ADMIN' && session.lecturerId !== req.user?.lecturerId) {
        sendError(res, 'Forbidden: You do not own this session', 403); return;
      }
      // Enrolled students
      const enrollments = await prisma.enrollment.findMany({
        where: { moduleId: session.moduleId },
        include: {
          student: { include: { user: true } },
        },
      });

      const scannedStudentIds = new Set(session.attendanceRecords.map((r) => r.studentId));

      const checkedInStudents = session.attendanceRecords.map((rec) => ({
        id: rec.id,
        studentId: rec.studentId,
        studentNumber: rec.student.studentNumber,
        name: rec.student.user.name,
        status: rec.attendanceStatus,
        scannedAt: rec.scannedAt,
        verificationMethod: rec.verificationMethod,
      }));

      const missingStudents = enrollments
        .filter((e) => !scannedStudentIds.has(e.studentId))
        .map((e) => ({
          studentId: e.studentId,
          studentNumber: e.student.studentNumber,
          name: e.student.user.name,
        }));

      const presentCount = checkedInStudents.filter((s) => s.status === AttendanceStatus.PRESENT).length;
      const lateCount = checkedInStudents.filter((s) => s.status === AttendanceStatus.LATE).length;
      const absentCount = checkedInStudents.filter((s) => s.status === AttendanceStatus.ABSENT).length;

      sendSuccess(res, {
        session: {
          id: session.id,
          sessionCode: session.sessionCode,
          moduleCode: session.module.moduleCode,
          moduleName: session.module.moduleName,
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
        },
        counts: {
          totalEnrolled: enrollments.length,
          checkedIn: presentCount + lateCount,
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          missing: missingStudents.length,
        },
        checkedInStudents,
        missingStudents,
      });
    } catch (err: any) {
      sendError(res, 'Failed to fetch session live data', 500);
    }
  }

  /**
   * Close Attendance Session & Auto-Mark Missing Students as ABSENT
   */
  public static async closeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lecturerId = req.user?.lecturerId;

      const session = await prisma.attendanceSession.findUnique({
        where: { id },
        include: { module: true },
      });

      if (!session) {
        sendError(res, 'Session not found', 404);
        return;
      }

      if (session.lecturerId !== lecturerId && req.user?.role !== 'ADMIN') {
        sendError(res, 'Forbidden: You do not own this session', 403);
        return;
      }

      if (session.status === SessionStatus.CLOSED) {
        sendError(res, 'Session is already closed', 400);
        return;
      }

      const updatedSession = await finalizeSession(id, session.endTime <= new Date() ? 'EXPIRED' : 'CLOSED');

      // 7. Calculate final summary
      const finalRecords = await prisma.attendanceRecord.findMany({
        where: { sessionId: id },
      });

      const total = finalRecords.length;
      const present = finalRecords.filter((r) => r.attendanceStatus === AttendanceStatus.PRESENT).length;
      const late = finalRecords.filter((r) => r.attendanceStatus === AttendanceStatus.LATE).length;
      const absent = finalRecords.filter((r) => r.attendanceStatus === AttendanceStatus.ABSENT).length;
      const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      sendSuccess(res, {
        sessionCode: updatedSession.sessionCode,
        moduleCode: session.module.moduleCode,
        moduleName: session.module.moduleName,
        totalStudents: total,
        present,
        late,
        absent,
        attendanceRate,
      }, 'Session closed and missing students automatically marked absent');
    } catch (err: any) {
      console.error('Close session error:', err);
      sendError(res, 'Failed to close attendance session', 500);
    }
  }
}
